// 判断是否为纯现金流/利息/费用/外汇兑换项 (非真实可交易证券股票/期权标的)
export function isNonSecuritiesItem(sym: string | null): boolean {
  if (!sym) return true;
  const s = String(sym).trim().toUpperCase();
  if (s.startsWith('(出入金') || s === '-' || s === 'NAN' || s === 'NONE') return true;

  // 1. 过滤标准外汇现金兑换对 (例如 USD.CNH, CNH.USD, EUR.USD 等)
  if (/^[A-Z]{3}\.[A-Z]{3}$/.test(s)) return true;

  // 2. 过滤外汇折算损益 (FX Translations P&L)
  if (s.includes('FX') || s.includes('TRANSLATION')) return true;

  // 3. 过滤出入金、转账、启动付款、利息与各种管理费
  const nonSecPatterns = [
    '利息', '转账', 'CUSTODY', 'INACTIVITY', 'FEE', '电子资金转账',
    '快照', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INTEREST',
    '付款', 'PAYMENT', '入金', '出金', '资金', '折算'
  ];
  return nonSecPatterns.some(p => s.includes(p));
}

import type { Trade } from '../types/ledger';

export const HEADER_MAP: Record<string, string> = {
  'Date/Time': '日期',
  'TradeDate': '日期',
  'Trade Date': '日期',
  'Date': '日期',
  'Account': '账户',
  'Description': '说明',
  'Type': '交易类型',
  'Symbol': '代码',
  'Quantity': '数量',
  'Price': '价格',
  'Price Currency': '价格货币',
  'Amount': '总额',
  'Commission': '佣金',
  'Net': '净额'
};

export const TRADE_TYPE_MAP: Record<string, string> = {
  'Buy': '买',
  'Sell': '卖',
  'Assigned': '被行权',
  'Exercised': '行权',
  'Split': '拆股',
  'Dividend': '股息',
  'Withholding Tax': '外国预扣税',
  'Payment In Lieu': '替代支付',
  'Credit Interest': '贷方利息',
  'Debit Interest': '借方利息',
  'Deposit': '存款',
  'Withdrawal': '取款',
  'Other Fees': '其它费用',
  'Adjustment': '调整'
};

export const TRADE_TYPES = new Set(['买', '卖', '被行权', '行权', '拆股', 'Split', 'Buy', 'Sell', 'Exercised', 'Assigned']);

export const CASH_EQUIVALENT_SYMBOLS = new Set(['BOXX', 'SGOV', 'BIL', 'SHV', 'USFR', 'ICSH']);

export function isCashEquivalentSymbol(sym: string | null): boolean {
  if (!sym) return false;
  const under = getUnderlyingSymbol(sym).toUpperCase();
  return CASH_EQUIVALENT_SYMBOLS.has(under);
}

// 判断是否为标准 OCC 格式的期权代码 (例如 "NVDA  260803P00200000" 或 "UNH 251121P00295000")
export function isOptionSymbol(symStr: string): boolean {
  if (!symStr) return false;
  return /[CP]\d{8}$/.test(symStr.trim()) && /\d{6}[CP]/.test(symStr.trim());
}

export function getUnderlyingSymbol(sym: string | null): string {
  if (!sym || sym === '-' || sym === 'nan') return '(出入金/利息)';
  const str = String(sym).trim();
  // 仅对期权代码（符合 OCC 规范）提取底层标的代码，避免误伤如 "BRK B" 等包含空格的正股
  if (isOptionSymbol(str)) {
    return str.split(' ')[0];
  }
  return str;
}

// 解析期权代码提取行权价（如 "NVDA  260803P00200000" -> 200，"AAPL  240517C00185000" -> 185）
export function parseOptionStrike(symStr: string): number | null {
  if (!symStr || !isOptionSymbol(symStr)) return null;
  // 期权代码标准格式末尾8位数字表示价格，前5位为整数，后3位为小数
  const match = symStr.match(/[CP](\d{8})$/);
  if (match) {
    const rawVal = parseInt(match[1], 10);
    return rawVal / 1000;
  }
  return null;
}

// 解析期权代码提取到期日（如 "GOOG  251010P00230000" -> "2025-10-10"）
export function parseOptionExpiryDate(symStr: string): string | null {
  if (!symStr || !isOptionSymbol(symStr)) return null;
  const match = symStr.match(/\s+(\d{2})(\d{2})(\d{2})[CP]/);
  if (match) {
    const yr = 2000 + parseInt(match[1], 10);
    const mo = String(parseInt(match[2], 10)).padStart(2, '0');
    const dy = String(parseInt(match[3], 10)).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  }
  return null;
}

export function parseDateToTimestamp(val: any): number | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str === "-" || str === "nan") return null;

  // 1. 标准 ISO/带空格格式: "2024-03-15", "2024-03-15, 10:30:00"
  const cleaned = str.replace(",", " ").trim();
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) return parsed;

  // 2. 紧凑型格式 YYYYMMDD: "20240315"
  if (/^d{8}$/.test(str)) {
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(4, 6), 10) - 1;
    const d = parseInt(str.slice(6, 8), 10);
    return new Date(y, m, d).getTime();
  }

  // 3. 美式日期格式 MM/DD/YYYY: "03/15/2024"
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  if (mdy) {
    const m = parseInt(mdy[1], 10) - 1;
    const d = parseInt(mdy[2], 10);
    const y = parseInt(mdy[3], 10);
    return new Date(y, m, d).getTime();
  }

  return null;
}

export function parseIBKRRows(rows: string[][]): { trades: Trade[]; headers: string[] } {
  const sections: Record<string, { headers: string[]; data: string[][] }> = {};
  let detectedHeaders: string[] = [];

  // 检测是否为带 Section,Type 前缀的多段式 IBKR 报表 (如 "Trades,Header,...")
  let isSectioned = false;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (row && row.length >= 2 && (row[1] === "Header" || row[1] === "Data")) {
      isSectioned = true;
      break;
    }
  }

  // 需要排除的纯报表元数据/资金概要说明段落
  const METADATA_SECTIONS = new Set([
    "Statement", "总结", "Summary", "Account Information", "账户信息",
    "Cash Report", "Net Asset Value", "净资产价值", "Information"
  ]);

  if (isSectioned) {
    rows.forEach(row => {
      if (!row || row.length < 2) return;
      const sec = String(row[0] || "").trim();
      const type = String(row[1] || "").trim();
      const content = row.slice(2);

      // 忽略报表基本信息、资金总结等元数据段
      if (METADATA_SECTIONS.has(sec)) return;

      if (type === "Header") {
        // 过滤只有两列的"域名称/域值"键值对元数据段
        const isKeyValueMeta = content.length <= 2 && content.some(h => /^(域名称|field\s*name|property)$/i.test(String(h).trim()));
        if (isKeyValueMeta) return;

        if (!sections[sec]) {
          sections[sec] = { headers: content, data: [] };
          // 仅收集真实交易流水的表头列名
          content.forEach(h => {
            const trimmed = String(h || "").trim();
            if (trimmed && !detectedHeaders.includes(trimmed)) {
              detectedHeaders.push(trimmed);
            }
          });
        }
      } else if (type === "Data" && sections[sec]) {
        sections[sec].data.push(content);
      }
    });
  } else if (rows.length > 1) {
    // 平铺式标准 CSV (首行为表头，后续行为数据)
    detectedHeaders = rows[0].map(h => String(h || "").trim()).filter(Boolean);
    sections["Default"] = {
      headers: detectedHeaders,
      data: rows.slice(1).filter(r => r && r.some(cell => String(cell || "").trim() !== ""))
    };
  }

  const allTrades: Trade[] = [];

  Object.keys(sections).forEach(sec => {
    const secObj = sections[sec];
    const headers = secObj.headers;
    const rawData = secObj.data;

    // 灵活匹配各类 IBKR 日期表头字段
    const dateIdx = headers.findIndex(h => {
      const trimmed = (h || "").trim();
      return ["Date", "Date/Time", "TradeDate", "Trade Date", "日期", "交易日期", "时间/日期"].includes(trimmed) ||
             /^(date|trade\s*date|交易日期|日期)$/i.test(trimmed);
    });

    // 检查行记录的时间排序方向；避免无脑盲目 reverse 破坏时序
    let isDescending = false;
    if (dateIdx !== -1 && rawData.length > 1) {
      let firstTime: number | null = null;
      let lastTime: number | null = null;

      for (let i = 0; i < rawData.length; i++) {
        firstTime = parseDateToTimestamp(rawData[i][dateIdx]);
        if (firstTime !== null) break;
      }
      for (let i = rawData.length - 1; i >= 0; i--) {
        lastTime = parseDateToTimestamp(rawData[i][dateIdx]);
        if (lastTime !== null) break;
      }

      if (firstTime !== null && lastTime !== null && firstTime !== lastTime) {
        isDescending = firstTime > lastTime;
      }
    }

    const dataToProcess = isDescending ? rawData.slice().reverse() : rawData.slice();

    dataToProcess.forEach(row => {
      const item: Partial<Trade> = {
        rawRow: {}
      };

      headers.forEach((h, i) => {
        const val = row[i] !== undefined ? String(row[i]).trim() : "";
        (item.rawRow as Record<string, string>)[h] = val;
        (item as any)[h] = val;

        const mappedKey = HEADER_MAP[h];
        if (mappedKey) {
          (item as any)[mappedKey] = val;
        }
      });

      if (item["交易类型"]) {
        const typeKey = String(item["交易类型"]).trim();
        item["交易类型"] = TRADE_TYPE_MAP[typeKey] || typeKey;
      }

      // 提取核心数值供撮合计算
      item["数量"] = item["数量"] ? parseFloat(String(item["数量"])) || 0 : 0;
      item["净额"] = item["净额"] ? parseFloat(String(item["净额"])) || 0 : 0;
      item["佣金"] = item["佣金"] ? parseFloat(String(item["佣金"])) || 0 : 0;
      item["价格"] = item["价格"] ? parseFloat(String(item["价格"])) || 0 : 0;
      item["总额"] = item["总额"] ? parseFloat(String(item["总额"])) || 0 : 0;

      // 1:1 完整保留每一行记录，针对纯利息/出入金补充安全默认标的代码标识
      if (!item["代码"] || item["代码"] === "-" || item["代码"] === "nan") {
        item["代码"] = item["说明"] || (item as any)["Description"] || "(出入金/现金流)";
      }

      allTrades.push(item as Trade);
    });
  });

  return { trades: allTrades, headers: detectedHeaders };
}
