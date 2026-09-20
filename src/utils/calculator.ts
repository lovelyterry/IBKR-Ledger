import type { Trade, OpenPosition, ClosedPosition, SummaryStats } from '../types/ledger';
import { getUnderlyingSymbol, parseOptionStrike, parseOptionExpiryDate, isOptionSymbol, isCashEquivalentSymbol, isNonSecuritiesItem, TRADE_TYPES } from './parser';

export function calcCostBasis(trades: Trade[]): { openRows: OpenPosition[]; closedRows: ClosedPosition[] } {
  // 0. 获取当前所有交易记录中的最大交易日期 (全局账单最新截至日期)
  let maxAccountDate = '';
  trades.forEach(t => {
    const d = t['日期'] ? String(t['日期']) : '';
    if (d && (!maxAccountDate || d > maxAccountDate)) {
      maxAccountDate = d;
    }
  });

  // 1. 按底层标的代码分组 (严格过滤利息/出入金/管理费等非证券项)
  const symGroup: Record<string, Trade[]> = {};
  trades.forEach(t => {
    const symStr = String(t['代码'] || '');
    if (!symStr || symStr === '-' || symStr === 'nan') return;
    if (isNonSecuritiesItem(symStr)) return;
    const under = getUnderlyingSymbol(symStr);
    if (isNonSecuritiesItem(under)) return;
    if (!symGroup[under]) symGroup[under] = [];
    symGroup[under].push(t);
  });

  const openRows: OpenPosition[] = [];
  const closedRows: ClosedPosition[] = [];

  // 2. 对每个标的代码独立计算股票持仓与做 T 盈亏
  Object.keys(symGroup).forEach(sym => {
    if (isNonSecuritiesItem(sym)) return;
    const symTrades = symGroup[sym];
    // 过滤纯利息/转账等非交易项 (必须包含至少一笔真实证券买卖/行权交易)
    const hasRealTrade = symTrades.some(t => TRADE_TYPES.has(String(t['交易类型'] || '')) || t['数量']);
    if (!hasRealTrade) return;

    // 按时间正序排列该标的的所有交易 (保持同日期在 CSV 中的原始稳定顺序)
    const sortedTrades = symTrades.slice().sort((a, b) => {
      const da = a['日期'] ? String(a['日期']) : '';
      const db = b['日期'] ? String(b['日期']) : '';
      if (da !== db) return da.localeCompare(db);
      return 0; // 保持原有稳定顺序
    });

    // 统计持有到期归零且未发生买回平仓的期权合约
    const pureExpiredContractSet = new Set<string>();
    const contractTradesMap: Record<string, Trade[]> = {};
    symTrades.forEach(t => {
      const s = String(t['代码'] || '');
      if (isOptionSymbol(s)) {
        if (!contractTradesMap[s]) contractTradesMap[s] = [];
        contractTradesMap[s].push(t);
      }
    });

    Object.entries(contractTradesMap).forEach(([s, cTrades]) => {
      const expiryDate = parseOptionExpiryDate(s);
      if (expiryDate && expiryDate <= maxAccountDate) {
        const hasBuy = cTrades.some(x => (Number(x['数量']) || 0) > 0);
        const hasSell = cTrades.some(x => (Number(x['数量']) || 0) < 0);
        const netQty = cTrades.reduce((sum, x) => sum + (Number(x['数量']) || 0), 0);
        // 1) 纯卖出且持有到期作废（权利金全收落袋）
        // 2) 纯买入且持有到期作废（权利金全部损失归零）
        if ((!hasBuy && netQty < -1e-5) || (!hasSell && netQty > 1e-5)) {
          pureExpiredContractSet.add(s);
        }
      }
    });

    let runningQty = 0;
    let runningCost = 0;
    const optRunningQtyMap: Record<string, number> = {}; // 按具体期权代码精准追踪当前持仓张数
    const optRunningCostMap: Record<string, number> = {}; // 按具体期权代码精准追踪当前持仓权利金成本
    const optionOpenQtyMap: Record<string, number> = {}; // 按具体期权代码精准追踪未平仓张数
    const optionNetPremiumMap: Record<string, number> = {}; // 按具体期权代码追踪其收付的净权利金
    let realizedPnl = 0;
    let optPremium = 0;
    let divSum = 0;
    let taxSum = 0;
    let txCount = 0;
    let netSum = 0;
    let commSum = 0;
    let firstBuyDate = '';
    let lastCloseDate = '';

    sortedTrades.forEach(t => {
      txCount++;
      (t as any)._realizedPnl = 0;
      netSum += (t['净额'] || 0);
      commSum += (t['佣金'] || 0);

      const tDate = t['日期'] ? String(t['日期']) : '';
      if (tDate) {
        if (!firstBuyDate || tDate < firstBuyDate) firstBuyDate = tDate;
        if (!lastCloseDate || tDate > lastCloseDate) lastCloseDate = tDate;
      }

      const symStr = String(t['代码'] || '');
      const type = String(t['交易类型'] || '');

      // 统计该标的产生的预扣税/预扣税费
      if (type === '外国预扣税' || type === 'Withholding Tax') {
        taxSum += (t['净额'] || 0);
        (t as any)._realizedPnl = (t['净额'] || 0);
      }
      // 统计该标的产生的股息/替代支付收益
      else if (['股息', '替代支付', 'Dividend', 'Payment In Lieu'].includes(type)) {
        divSum += (t['净额'] || 0);
        (t as any)._realizedPnl = (t['净额'] || 0);
      }
      // 如果是期权交易 (代码符合标准 OCC 期权规范，避免误伤 BRK B 等带空格的正股)
      else if (isOptionSymbol(symStr)) {
        const optQty = Number(t['数量']) || 0;
        const netAmt = (t['净额'] || 0);
        optPremium += netAmt;
        optionNetPremiumMap[symStr] = (optionNetPremiumMap[symStr] || 0) + netAmt;

        const curQty = optRunningQtyMap[symStr] || 0;
        const curCost = optRunningCostMap[symStr] || 0;

        // 判断该期权合约是否为平仓/减仓动作 (当前有多头且卖平，或者当前有空头且买入平仓)
        const isOptClosing = (curQty > 1e-5 && optQty < -1e-5) || (curQty < -1e-5 && optQty > 1e-5);

        if (isOptClosing) {
          const closeQty = Math.abs(optQty) <= Math.abs(curQty) ? optQty : -curQty;
          const remQty = optQty - closeQty;

          const closeRatio = Math.abs(closeQty) / Math.abs(optQty);
          const closeNet = netAmt * closeRatio;
          const remNet = netAmt * (1 - closeRatio);

          const avgCost = curCost / curQty;
          const costOfClosed = avgCost * closeQty;

          const pnlDelta = closeNet + costOfClosed;
          (t as any)._realizedPnl = pnlDelta;
          (t as any)._realizedDate = tDate;

          optRunningQtyMap[symStr] = curQty + closeQty;
          optRunningCostMap[symStr] = curCost + costOfClosed;

          if (Math.abs(optRunningQtyMap[symStr]) < 1e-5) {
            optRunningQtyMap[symStr] = 0;
            optRunningCostMap[symStr] = 0;
          }
          if (Math.abs(remQty) > 1e-5) {
            optRunningQtyMap[symStr] = remQty;
            optRunningCostMap[symStr] = -remNet;
          }
        } else {
          // 开仓 / 加仓
          optRunningQtyMap[symStr] = curQty + optQty;
          optRunningCostMap[symStr] = curCost - netAmt;

          if (Math.abs(optRunningQtyMap[symStr]) < 1e-5) {
            optRunningQtyMap[symStr] = 0;
            optRunningCostMap[symStr] = 0;
          }

          const expiryDate = parseOptionExpiryDate(symStr);
          // 纯单边到期期权在到期日结算（卖方盈利 netAmt，买方亏损 netAmt）；已平仓期权仅在平仓日结算
          if (pureExpiredContractSet.has(symStr)) {
            (t as any)._realizedPnl = netAmt;
            (t as any)._realizedDate = expiryDate;
          } else {
            (t as any)._realizedPnl = 0;
            (t as any)._realizedDate = tDate;
          }
        }

        // 只有当期权到期日明确晚于全局最新账单日期(即真正尚未到期的期权)，才追踪其买卖对消后的未平仓张数
        const expiryDate = parseOptionExpiryDate(symStr);
        if (!expiryDate || (maxAccountDate && expiryDate > maxAccountDate)) {
          optionOpenQtyMap[symStr] = (optionOpenQtyMap[symStr] || 0) + optQty;
        }
      }
      // 如果是正股交易
      else if (TRADE_TYPES.has(type) && t['数量'] !== null && t['数量'] !== 0) {
        const qty = Number(t['数量']) || 0;
        const net = Number(t['净额']) || 0;

        // 特殊处理拆股 (Split)
        if (type === '拆股' || type === 'Split') {
          runningQty += qty;
          (t as any)._realizedPnl = 0;
          if (Math.abs(runningQty) < 1e-5) {
            runningQty = 0;
            runningCost = 0;
          }
          return;
        }

        // 判断是否为平仓/减仓动作
        const isClosing = (runningQty > 1e-5 && qty < -1e-5) || (runningQty < -1e-5 && qty > 1e-5);
        if (isClosing) {
          const closeQty = Math.abs(qty) <= Math.abs(runningQty) ? qty : -runningQty;
          const remQty = qty - closeQty;

          const closeRatio = Math.abs(closeQty) / Math.abs(qty);
          const closeNet = net * closeRatio;
          const remNet = net * (1 - closeRatio);

          const avgCost = runningCost / runningQty;
          const costOfClosed = avgCost * closeQty;

          const pnlDelta = (closeNet + costOfClosed);
          realizedPnl += pnlDelta;
          (t as any)._realizedPnl = pnlDelta;
          runningQty += closeQty;
          runningCost += costOfClosed;

          if (Math.abs(runningQty) < 1e-5) {
            runningQty = 0;
            runningCost = 0;
          }

          // 处理仓位反转 (多转空 / 空转多)
          if (Math.abs(remQty) > 1e-5) {
            runningQty = remQty;
            runningCost = -remNet;
          }
        } else {
          // 开仓记录持仓成本，不计已实现盈亏
          (t as any)._realizedPnl = 0;
          runningQty += qty;
          runningCost -= net;
          if (Math.abs(runningQty) < 1e-5) {
            runningQty = 0;
            runningCost = 0;
          }
        }
      }
    });

    // 精准汇总当前尚未到期/未平仓的期权张数与明细，并计算未平仓期权的权利金
    let openOptPremium = 0;
    const runningOptionQty = Object.values(optionOpenQtyMap).reduce((sum, q) => sum + q, 0);
    const openOptions = Object.entries(optionOpenQtyMap)
      .filter(([_, qty]) => Math.abs(qty) > 1e-5)
      .map(([optionSym, qty]) => {
        const strike = parseOptionStrike(optionSym);
        const expiryDate = parseOptionExpiryDate(optionSym);
        let type: 'CALL' | 'PUT' | 'UNKNOWN' = 'UNKNOWN';
        if (/[C]\d{8}$/.test(optionSym.trim())) {
          type = 'CALL';
        } else if (/[P]\d{8}$/.test(optionSym.trim())) {
          type = 'PUT';
        }
        const netPrem = optionNetPremiumMap[optionSym] || 0;
        openOptPremium += netPrem;
        return {
          symbol: optionSym,
          qty,
          expiryDate,
          strike,
          type,
          netPremium: netPrem
        };
      });

    // 已到期/已平仓的期权收益 (未平仓/未到期的期权权利金不计入摊薄成本)
    const closedOptPremium = optPremium - openOptPremium;
    const netDivAndTax = divSum + taxSum;
    const combinedPnl = realizedPnl + closedOptPremium + netDivAndTax;

    // 如果当前仍有正股持仓 或 仍有尚未平仓的期权，计入当前持仓列表 (Open Position)
    if (Math.abs(runningQty) > 1e-5 || Math.abs(runningOptionQty) > 1e-5) {
      const hasStock = Math.abs(runningQty) > 1e-5;
      const absCost = Math.abs(runningCost);
      const absQty = hasStock ? Math.abs(runningQty) : 0;

      // 仅在持有正股时计算均价与摊薄成本，纯期权持仓(无正股)设为 null
      const avg = hasStock ? absCost / absQty : null;
      const allinCost = absCost - realizedPnl - closedOptPremium;
      const allinAvg = hasStock ? allinCost / absQty : null;

      const ultimateCost = allinCost - netDivAndTax;
      const ultimateAvg = hasStock ? ultimateCost / absQty : null;

      // 计算持仓天数 (建仓至最近交易日)
      let holdingDays = 0;
      if (firstBuyDate && lastCloseDate) {
        const d1 = new Date(firstBuyDate).getTime();
        const d2 = new Date(lastCloseDate).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          holdingDays = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        }
      }

      // 计算当前持仓在历史已平仓段的累计资本-时间占用 (Total Capital-Days)
      let openCapitalDays = 0;
      const stockLots: { qty: number; cost: number; dateMs: number }[] = [];
      const optionLots: Record<string, { strike: number | null; isSell: boolean; isCall: boolean; qty: number; netCost: number; dateMs: number }[]> = {};

      // 基准日期：若账单内有最新交易日期，优先使用账单截至日期，避免历史旧账单虚增天数
      const benchmarkDateMs = maxAccountDate ? new Date(maxAccountDate).getTime() : Date.now();
      const nowMs = isNaN(benchmarkDateMs) ? Date.now() : benchmarkDateMs;

      sortedTrades.forEach(t => {
        const tDateStr = t['日期'] ? String(t['日期']) : '';
        if (!tDateStr) return;
        const tDateMs = new Date(tDateStr).getTime();
        if (isNaN(tDateMs)) return;

        const symStr = String(t['代码'] || '');
        const type = String(t['交易类型'] || '');

        if (isOptionSymbol(symStr)) {
          const qty = Number(t['数量']) || 0;
          const net = Number(t['净额']) || 0;
          const strike = parseOptionStrike(symStr);
          const isCall = /[C]\d{8}$/.test(symStr.trim());

          if (!optionLots[symStr]) optionLots[symStr] = [];
          const lots = optionLots[symStr];

          if (lots.length === 0 || (lots[0].qty > 0 && qty > 0) || (lots[0].qty < 0 && qty < 0)) {
            const isSell = qty < 0;
            let perUnitCapital = 0;
            if (isSell) {
              const currentStockQty = stockLots.reduce((acc, l) => acc + l.qty, 0);
              const openSellCallsQty = Object.values(optionLots).flat()
                .filter(l => l.isSell && l.isCall)
                .reduce((acc, l) => acc + l.qty, 0);
              const isCovered = isCall && (currentStockQty >= (openSellCallsQty + Math.abs(qty)) * 100);
              if (isCovered) {
                perUnitCapital = 0;
              } else {
                perUnitCapital = strike ? strike * 100 : Math.abs(net / qty);
              }
            } else {
              perUnitCapital = Math.abs(net / Math.abs(qty));
            }
            lots.push({ strike, isSell, isCall, qty: Math.abs(qty), netCost: perUnitCapital, dateMs: tDateMs });
          } else {
            let matchQty = Math.abs(qty);
            while (matchQty > 1e-5 && lots.length > 0) {
              const head = lots[0];
              const takeQty = Math.min(matchQty, head.qty);
              const days = Math.max(1, Math.round((tDateMs - head.dateMs) / (1000 * 60 * 60 * 24)));
              openCapitalDays += head.netCost * takeQty * days;
              head.qty -= takeQty;
              matchQty -= takeQty;
              if (head.qty < 1e-5) lots.shift();
            }
          }
        } else if (TRADE_TYPES.has(type) && t['数量'] !== null && t['数量'] !== 0) {
          const qty = Number(t['数量']) || 0;
          const price = Math.abs(Number(t['价格']) || 0);
          if (type === '拆股' || type === 'Split') return;

          if (qty > 0) {
            stockLots.push({ qty, cost: price * qty, dateMs: tDateMs });
          } else if (qty < 0) {
            let matchQty = Math.abs(qty);
            while (matchQty > 1e-5 && stockLots.length > 0) {
              const head = stockLots[0];
              const takeQty = Math.min(matchQty, head.qty);
              const takeCost = (head.cost / head.qty) * takeQty;
              const days = Math.max(1, Math.round((tDateMs - head.dateMs) / (1000 * 60 * 60 * 24)));
              openCapitalDays += takeCost * days;
              head.qty -= takeQty;
              head.cost -= takeCost;
              matchQty -= takeQty;
              if (head.qty < 1e-5) stockLots.shift();
            }
          }
        }
      });

      // 加上目前尚未平仓的正股段从买入日计算截至今天的 Capital-Days
      stockLots.forEach(head => {
        if (head.qty > 1e-5) {
          const days = Math.max(1, Math.round((nowMs - head.dateMs) / (1000 * 60 * 60 * 24)));
          openCapitalDays += head.cost * days;
        }
      });

      // 加上目前尚未平仓的期权段截至今天的 Capital-Days
      Object.values(optionLots).forEach(lots => {
        lots.forEach(head => {
          if (head.qty > 1e-5 && head.netCost > 0) {
            const days = Math.max(1, Math.round((nowMs - head.dateMs) / (1000 * 60 * 60 * 24)));
            openCapitalDays += head.netCost * head.qty * days;
          }
        });
      });

      openRows.push({
        sym,
        qty: runningQty,
        cost: absCost,
        avg: avg,
        allinAvg: allinAvg,
        realized: realizedPnl,
        optPremium: closedOptPremium,
        divSum: divSum,
        taxSum: taxSum,
        commSum: commSum,
        ultimateAvg: ultimateAvg,
        combinedPnl: combinedPnl,
        firstBuyDate: firstBuyDate || '-',
        weight: 0,
        holdingDays,
        openOptionQty: runningOptionQty,
        openOptions,
        totalCapitalDays: openCapitalDays
      });
    } else {
      // 计入已平仓列表 (Closed Position)
      let holdingDays = 0;
      if (firstBuyDate && lastCloseDate) {
        const d1 = new Date(firstBuyDate).getTime();
        const d2 = new Date(lastCloseDate).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          holdingDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        }
      }
      // 计算平仓交易年化收益率
      const costEstimate = Math.max(Math.abs(netSum) / 2, 1);
      const annualizedRoi = holdingDays > 0 ? (combinedPnl / costEstimate) * (365 / holdingDays) * 100 : 0;

      closedRows.push({
        sym,
        realized: realizedPnl,
        optPremium: optPremium,
        divSum: divSum,
        taxSum: taxSum,
        combinedPnl: combinedPnl,
        txCount,
        netSum,
        commSum,
        firstBuyDate: firstBuyDate || '-',
        lastCloseDate: lastCloseDate || '-',
        annualizedRoi: Number(annualizedRoi.toFixed(2))
      });
    }
  });

  // 统一计算持仓占用资金百分比 (Weight %)
  const totalCostAllOpen = openRows.reduce((sum, r) => sum + r.cost, 0);
  openRows.forEach(r => {
    r.weight = totalCostAllOpen > 0 ? (r.cost / totalCostAllOpen) * 100 : 0;
  });

  return { openRows, closedRows };
}

export function computeSummaryStats(filteredTrades: Trade[]): SummaryStats {
  let totalRealized = 0;
  let totalDivs = 0;
  let totalComm = 0;

  filteredTrades.forEach(t => {
    const type = t['交易类型'];
    const net = t['净额'] || 0;
    const comm = t['佣金'] || 0;
    const symStr = String(t['代码'] || '');

    totalComm += comm;

    // 过滤掉期权代码，保留正股（含带空格的 BRK B 等）及各类利息/股息
    if (!isOptionSymbol(symStr) && ['股息', '外国预扣税', '替代支付', '贷方利息', '借方利息'].includes(type)) {
      totalDivs += net;
    }
  });

  const { openRows, closedRows } = calcCostBasis(filteredTrades);
  totalRealized = [...openRows, ...closedRows].reduce((acc, r) => acc + r.realized, 0);
  const totalOptPremium = [...openRows, ...closedRows].reduce((acc, r) => acc + r.optPremium, 0);

  const netProfit = totalRealized + totalOptPremium + totalDivs;

  return {
    netProfit,
    totalRealized,
    totalOptPremium,
    totalDivs,
    totalComm
  };
}


export interface CalendarDayData {
  date: string;
  netPnl: number;
  count: number;
}

export function calculateCalendarHeatmapData(
  trades: Trade[]
): {
  range: [string, string];
  data: [string, number][]; // [YYYY-MM-DD, count]
  dayDetailMap: Record<string, { netPnl: number; count: number }>;
} {
  const dayDetailMap: Record<string, { netPnl: number; count: number }> = {};
  let minDate = '';
  let maxDate = '';

  // 统计每日成交笔数与盈亏
  trades.forEach(t => {
    const type = String(t['交易类型'] || '');
    if (['存款', '取款', 'Deposit', 'Withdrawal', '其它费用', 'Other Fees'].includes(type)) return;
    const rawSym = String(t['代码'] || '');
    if (isNonSecuritiesItem(rawSym)) return;
    const s = getUnderlyingSymbol(rawSym);
    if (!s || isNonSecuritiesItem(s)) return;
    if (!t['日期']) return;
    const dateStr = String(t['日期']).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

    if (!minDate || dateStr < minDate) minDate = dateStr;
    if (!maxDate || dateStr > maxDate) maxDate = dateStr;

    if (!dayDetailMap[dateStr]) {
      dayDetailMap[dateStr] = { netPnl: 0, count: 0 };
    }
    dayDetailMap[dateStr].count++;

    // 盈亏归因到结算生效日 (对于自然到期归零的期权，归因到到期日 expiryDate；平仓归因到成交日)
    const pnlDateStr = ((t as any)._realizedDate ? String((t as any)._realizedDate).slice(0, 10) : dateStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(pnlDateStr)) {
      if (!dayDetailMap[pnlDateStr]) {
        dayDetailMap[pnlDateStr] = { netPnl: 0, count: 0 };
      }
      dayDetailMap[pnlDateStr].netPnl += Number((t as any)._realizedPnl || 0);
    }
  });

  const data: [string, number][] = Object.entries(dayDetailMap).map(([date, item]) => [
    date,
    item.count
  ]);

  if (!minDate) {
    const today = new Date().toISOString().slice(0, 10);
    minDate = today;
    maxDate = today;
  }

  return {
    range: [minDate, maxDate],
    data,
    dayDetailMap
  };
}

// ==========================================
// 新增：月度 PnL 矩阵/季节性分析 (Monthly Seasonality Matrix)
// ==========================================

export interface MonthlyMatrixRow {
  year: number;
  months: Record<number, { pnl: number; count: number }>;
  totalPnl: number;
}

export interface MonthlyMatrixData {
  years: number[];
  rows: MonthlyMatrixRow[];
  monthTotals: Record<number, number>;
  grandTotalPnl: number;
  avgMonthlyPnl: number; // 月均已实现收益
  activeMonthsCount: number; // 有交易/结算的有效月份总数
}

export function calculateMonthlyMatrix(
  trades: Trade[],
  closedRows: ClosedPosition[] = [],
  openRows: OpenPosition[] = []
): MonthlyMatrixData {
  const yearMap: Record<number, Record<number, { pnl: number; count: number }>> = {};
  const monthTotals: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) monthTotals[m] = 0;

  // 1. 统一过滤出入金、其它费用及非证券项，并优先按 FIFO 打标的交易流水归因月度已实现盈亏与成交笔数
  let hasTradeTaggedPnl = false;

  trades.forEach(t => {
    const type = String(t['交易类型'] || '');
    if (['存款', '取款', 'Deposit', 'Withdrawal', '其它费用', 'Other Fees'].includes(type)) return;
    const rawSym = String(t['代码'] || '');
    if (isNonSecuritiesItem(rawSym)) return;
    const s = getUnderlyingSymbol(rawSym);
    if (!s || isNonSecuritiesItem(s)) return;
    if (!t['日期']) return;

    const d = new Date(String(t['日期']));
    if (isNaN(d.getTime())) return;

    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    if (!yearMap[year]) {
      yearMap[year] = {};
      for (let m = 1; m <= 12; m++) {
        yearMap[year][m] = { pnl: 0, count: 0 };
      }
    }
    yearMap[year][month].count += 1;

    const tradePnl = Number((t as any)._realizedPnl);
    if (!isNaN(tradePnl) && tradePnl !== 0) {
      // 按结算日期归集年月收益
      const pnlDateStr = String((t as any)._realizedDate || t['日期']).slice(0, 10);
      const pnlYear = parseInt(pnlDateStr.slice(0, 4), 10);
      const pnlMonth = parseInt(pnlDateStr.slice(5, 7), 10);

      if (!isNaN(pnlYear) && !isNaN(pnlMonth) && pnlMonth >= 1 && pnlMonth <= 12) {
        if (!yearMap[pnlYear]) {
          yearMap[pnlYear] = {};
          for (let m = 1; m <= 12; m++) {
            yearMap[pnlYear][m] = { pnl: 0, count: 0 };
          }
        }

        yearMap[pnlYear][pnlMonth].pnl += tradePnl;
        monthTotals[pnlMonth] += tradePnl;
        hasTradeTaggedPnl = true;
      }
    }
  });

  // 2. 如果交易明细尚未被打标 _realizedPnl，则回退到按平仓行的最终平仓月归因落袋收益
  if (!hasTradeTaggedPnl && closedRows.length > 0) {
    closedRows.forEach(p => {
      if (!p.lastCloseDate || p.lastCloseDate === '-') return;
      const d = new Date(p.lastCloseDate);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      if (!yearMap[year]) {
        yearMap[year] = {};
        for (let m = 1; m <= 12; m++) {
          yearMap[year][m] = { pnl: 0, count: 0 };
        }
      }

      yearMap[year][month].pnl += p.combinedPnl;
      monthTotals[month] += p.combinedPnl;
    });
  }

  const sortedYears = Object.keys(yearMap).map(Number).sort((a, b) => b - a);
  let grandTotalPnl = 0;

  const rows: MonthlyMatrixRow[] = sortedYears.map(year => {
    let yearTotal = 0;
    const monthsObj: Record<number, { pnl: number; count: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const item = yearMap[year][m];
      const pnlVal = Number(item.pnl.toFixed(2));
      monthsObj[m] = { pnl: pnlVal, count: item.count };
      yearTotal += pnlVal;
    }
    grandTotalPnl += yearTotal;
    return {
      year,
      months: monthsObj,
      totalPnl: Number(yearTotal.toFixed(2))
    };
  });

  for (let m = 1; m <= 12; m++) {
    monthTotals[m] = Number(monthTotals[m].toFixed(2));
  }

  // 计算持仓月数 (首笔交易至最新交易的跨度自然月数)
  let minDateMs = 0;
  let maxDateMs = 0;
  trades.forEach(t => {
    if (!t['日期']) return;
    const ms = new Date(String(t['日期'])).getTime();
    if (isNaN(ms)) return;
    if (minDateMs === 0 || ms < minDateMs) minDateMs = ms;
    if (maxDateMs === 0 || ms > maxDateMs) maxDateMs = ms;
  });

  let holdingMonthsCount = 1;
  if (minDateMs > 0 && maxDateMs >= minDateMs) {
    const minD = new Date(minDateMs);
    const maxD = new Date(maxDateMs);
    const yearDiff = maxD.getFullYear() - minD.getFullYear();
    const monthDiff = maxD.getMonth() - minD.getMonth();
    holdingMonthsCount = Math.max(1, yearDiff * 12 + monthDiff + 1);
  }

  const avgMonthlyPnl = grandTotalPnl / holdingMonthsCount;

  return {
    years: sortedYears,
    rows,
    monthTotals,
    grandTotalPnl: Number(grandTotalPnl.toFixed(2)),
    avgMonthlyPnl: Number(avgMonthlyPnl.toFixed(2)),
    activeMonthsCount: holdingMonthsCount
  };
}
