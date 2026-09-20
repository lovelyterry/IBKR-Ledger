// 交易记录标准接口
export interface Trade {
  账户: string | null;
  交易类型: string;
  日期: string | null;
  代码: string;
  数量: number | null;
  价格: number | null;
  价格货币?: string | null;
  总额: number | null;
  佣金: number | null;
  净额: number | null;
  说明: string | null;
  [key: string]: any;
}

// 未平仓期权合约接口
export interface OpenOptionItem {
  symbol: string;
  qty: number;
  expiryDate: string | null;
  strike: number | null;
  type: 'CALL' | 'PUT' | 'UNKNOWN';
  netPremium?: number; // 累计该未到期期权收付的权利金总额
}

// 当前持仓接口
export interface OpenPosition {
  sym: string;
  qty: number;
  cost: number;
  avg: number | null;
  allinAvg: number | null;
  realized: number;
  optPremium: number;
  divSum: number;
  taxSum: number;
  commSum: number;
  ultimateAvg: number | null;
  combinedPnl: number;
  firstBuyDate: string;
  weight: number;
  holdingDays: number;
  openOptionQty: number; // 尚未到期/未平仓的期权张数
  openOptions?: OpenOptionItem[]; // 未平仓期权合约明细
  currentPrice?: number | null;
  unrealizedPnl?: number | null;
  unrealizedRoi?: number | null; // 动态持仓浮盈/亏百分比 (%)
  marketValue?: number | null; // 当前持仓总市值 (实时股价 * 数量)
  totalPnl?: number | null; // 包含浮盈/亏在内的全口径综合总收益 (已实现 + 浮动盈亏)
  totalCapitalDays?: number; // 累计资本-时间占用 (Capital-Days)
  annualizedRoi?: number | null; // 包含实时浮盈/亏的年化收益率 (%)
}

// 历史已平仓接口
export interface ClosedPosition {
  sym: string;
  realized: number;
  optPremium: number;
  divSum: number;
  taxSum: number;
  combinedPnl: number;
  txCount: number;
  netSum: number;
  commSum: number;
  firstBuyDate: string;
  lastCloseDate: string;
  annualizedRoi: number;
}

// 全局过滤器状态接口
export interface FilterState {
  account: string;
  startDate: string;
  endDate: string;
  tradeType: string;
  symbol: string;
  netDirection: 'all' | 'positive' | 'negative';
  minAbsAmount: string;
}

// 核心 KPI 汇总
export interface SummaryStats {
  netProfit: number;
  totalRealized: number;
  totalOptPremium: number;
  totalDivs: number;
  totalComm: number;
  netCashBalance?: number;
}

// 表格排序状态接口
export interface SortState {
  key: string | null;
  asc: boolean;
}

// 当前激活 Tab 类型
export type TabName =
  | 'transactions'
  | 'analytics-behavior'
  | 'open-positions';
