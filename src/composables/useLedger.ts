import { reactive, ref, computed } from 'vue';
import type { Trade, FilterState, TabName, SortState, OpenPosition, ClosedPosition } from '../types/ledger';
import { parseIBKRRows, TRADE_TYPES, getUnderlyingSymbol } from '../utils/parser';
import { calcCostBasis, computeSummaryStats } from '../utils/calculator';
import Papa from 'papaparse';

// 全局单例状态
const rawAllTrades = ref<Trade[]>([]);
const rawCSVHeaders = ref<string[]>([]);
const activeFilteredTrades = ref<Trade[]>([]);
const activeTab = ref<TabName>('analytics-behavior');
const isSidebarCollapsed = ref<boolean>(true);
const isDrawerOpen = ref<boolean>(false);
const fileName = ref<string>('');
const theme = ref<'light' | 'dark'>((localStorage.getItem('ibkr_theme') as 'light' | 'dark') || 'light');

function applyThemeDOM(t: 'light' | 'dark') {
  if (t === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const filterState = reactive<FilterState>({
  account: 'all',
  startDate: '',
  endDate: '',
  tradeType: 'all',
  symbol: '',
  netDirection: 'all',
  minAbsAmount: ''
});

const sortState = reactive<Record<'tx' | 'open', SortState>>({
  tx: { key: null, asc: true },
  open: { key: null, asc: true }
});

// modal 弹窗状态
const isModalOpen = ref(false);
const modalSymbol = ref('');


export function useLedger() {
  const accountOptions = computed(() => {
    const accs = new Set(rawAllTrades.value.map(t => t['账户']).filter(Boolean) as string[]);
    return Array.from(accs);
  });

  const tradeTypeOptions = computed(() => {
    const types = new Set(rawAllTrades.value.map(t => t['交易类型']).filter(Boolean) as string[]);
    return Array.from(types);
  });

  function processCSVData(rows: string[][], name: string) {
    fileName.value = name;
    const parsed = parseIBKRRows(rows);
    rawAllTrades.value = parsed.trades;
    rawCSVHeaders.value = parsed.headers;
    resetFilters();
  }

  function parseCSVFile(file: File) {
    Papa.parse<string[]>(file, {
      complete: (results) => {
        processCSVData(results.data, file.name);
      },
      error: (err) => alert('CSV 解析错误: ' + err)
    });
  }

  function applyFilters() {
    const symbolFilter = filterState.symbol.trim().toLowerCase();
    const minAbsVal = filterState.minAbsAmount ? parseFloat(filterState.minAbsAmount) : NaN;

    activeFilteredTrades.value = rawAllTrades.value.filter(t => {
      if (filterState.account !== 'all' && t['账户'] !== filterState.account) return false;
      if (filterState.startDate && t['日期'] && String(t['日期']) < filterState.startDate) return false;
      if (filterState.endDate && t['日期'] && String(t['日期']) > filterState.endDate) return false;

      if (filterState.tradeType === 'trades' && !TRADE_TYPES.has(t['交易类型'])) return false;
      if (filterState.tradeType === 'dividends' && !['股息', '外国预扣税', '替代支付', '贷方利息', '借方利息'].includes(t['交易类型'])) return false;
      if (filterState.tradeType === 'transfers' && !['存款', '取款'].includes(t['交易类型'])) return false;
      if (!['all', 'trades', 'dividends', 'transfers'].includes(filterState.tradeType) && t['交易类型'] !== filterState.tradeType) return false;

      if (symbolFilter) {
        const sym = (t['代码'] || '').toLowerCase();
        const under = getUnderlyingSymbol(t['代码']).toLowerCase();
        if (!sym.includes(symbolFilter) && !under.includes(symbolFilter)) return false;
      }

      const net = t['净额'] !== null && t['净额'] !== undefined ? Number(t['净额']) : 0;
      if (filterState.netDirection === 'positive' && net <= 0) return false;
      if (filterState.netDirection === 'negative' && net >= 0) return false;

      if (!isNaN(minAbsVal) && Math.abs(net) < minAbsVal) return false;

      return true;
    });
  }

  function resetFilters() {
    filterState.account = 'all';
    filterState.startDate = '';
    filterState.endDate = '';
    filterState.tradeType = 'all';
    filterState.symbol = '';
    filterState.netDirection = 'all';
    filterState.minAbsAmount = '';
    applyFilters();
  }

  function setQuickDateRange(type: 'all' | 'ytd' | '3m' | '1m' | '1w' | 'today') {
    if (type === 'all') {
      if (rawAllTrades.value.length > 0) {
        const dates = rawAllTrades.value
          .map(t => t['日期'])
          .filter(Boolean) as string[];
        if (dates.length > 0) {
          dates.sort();
          filterState.startDate = dates[0];
          filterState.endDate = dates[dates.length - 1];
        } else {
          filterState.startDate = '';
          filterState.endDate = '';
        }
      } else {
        filterState.startDate = '';
        filterState.endDate = '';
      }
    } else {
      const now = new Date();
      filterState.endDate = now.toISOString().slice(0, 10);
      const startDate = new Date();
      if (type === 'ytd') {
        startDate.setFullYear(now.getFullYear(), 0, 1);
      } else if (type === '3m') {
        startDate.setMonth(now.getMonth() - 3);
      } else if (type === '1m') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (type === '1w') {
        startDate.setDate(now.getDate() - 7);
      } else if (type === 'today') {
        startDate.setDate(now.getDate());
      }
      filterState.startDate = startDate.toISOString().slice(0, 10);
    }
    applyFilters();
  }

  // 关键：撮合计算必须基于当前范围（或账号）的全量历史记录，避免因时间筛选截断买入而将平仓误判为开空仓
  const positions = computed(() => {
    const tradesForBasis = filterState.account === 'all'
      ? rawAllTrades.value
      : rawAllTrades.value.filter(t => t['账户'] === filterState.account);

    const res = calcCostBasis(tradesForBasis);

    const symFilter = filterState.symbol.trim().toLowerCase();
    if (symFilter) {
      return {
        openRows: res.openRows.filter(r => r.sym.toLowerCase().includes(symFilter)),
        closedRows: res.closedRows.filter(r => r.sym.toLowerCase().includes(symFilter))
      };
    }
    return res;
  });
  const openPositions = computed(() => positions.value.openRows);
  const closedPositions = computed(() => positions.value.closedRows);

  const displayTransactions = computed(() => {
    const list = [...activeFilteredTrades.value];
    const s = sortState.tx;
    if (s.key) {
      const key = s.key;
      const dir = s.asc ? 1 : -1;
      list.sort((a, b) => {
        const va = (a as any)[key] ?? (a.rawRow ? (a.rawRow as any)[key] : "") ?? "";
        const vb = (b as any)[key] ?? (b.rawRow ? (b.rawRow as any)[key] : "") ?? "";
        const na = parseFloat(String(va).replace(/,/g, ""));
        const nb = parseFloat(String(vb).replace(/,/g, ""));
        if (!isNaN(na) && !isNaN(nb) && String(va).trim() !== "" && String(vb).trim() !== "") {
          return (na - nb) * dir;
        }
        return String(va).localeCompare(String(vb)) * dir;
      });
    }
    return list;
  });

  const summary = computed(() => computeSummaryStats(activeFilteredTrades.value));

  function sortTable(tableType: 'tx' | 'open', key: string) {
    const s = sortState[tableType];
    if (s.key === key) {
      s.asc = !s.asc;
    } else {
      s.key = key;
      s.asc = true;
    }
  }

  function getSortIcon(tableType: 'tx' | 'open', key: string) {
    const s = sortState[tableType];
    if (s.key === key) {
      return s.asc ? '▲' : '▼';
    }
    return '▲';
  }

  function toggleSidebarCollapse() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  }

  function toggleDrawer() {
    isDrawerOpen.value = !isDrawerOpen.value;
  }

  function switchTab(tab: TabName) {
    activeTab.value = tab;
    isDrawerOpen.value = false; // 移动端选择后自动收起 Drawer
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    applyThemeDOM(theme.value);
    localStorage.setItem('ibkr_theme', theme.value);
  }

  function openDetailModal(sym: string) {
    modalSymbol.value = sym;
    isModalOpen.value = true;
  }

  function closeDetailModal() {
    isModalOpen.value = false;
  }

  return {
    rawAllTrades,
    rawCSVHeaders,
    activeFilteredTrades,
    activeTab,
    isSidebarCollapsed,
    isDrawerOpen,
    fileName,
    filterState,
    sortState,
    accountOptions,
    tradeTypeOptions,
    openPositions,
    closedPositions,
    displayTransactions,
    summary,
    isModalOpen,
    modalSymbol,
    parseCSVFile,
    applyFilters,
    resetFilters,
    setQuickDateRange,
    sortTable,
    getSortIcon,
    toggleSidebarCollapse,
    toggleDrawer,
    switchTab,
    theme,
    toggleTheme,
    openDetailModal,
    closeDetailModal
  };
}
