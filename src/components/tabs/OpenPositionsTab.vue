<template>
  <div class="space-y-4">
    <!-- 全局多维数据过滤器 -->
    <GlobalFilter />

    <!-- 持仓数据表格面板 -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 overflow-hidden">
      <!-- 表格 Header 统计行与搜索框 -->
      <div class="p-3.5 bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
        <!-- 搜索股票代码检索框 -->
        <div class="relative w-64">
          <input
            type="text"
            v-model="searchSymbol"
            placeholder="搜索标的代码 (如 NVDA, AAPL...)"
            class="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- 持仓总成本本金 -->
          <div class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-center gap-1.5 font-mono">
            <span class="text-slate-500 dark:text-slate-400 font-sans">持仓本金合计:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">
              ${{ totalCostSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
          </div>

          <!-- 标的数统计 (在仓 + 已平仓) -->
          <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-mono-num border border-slate-200 dark:border-slate-700">
            {{ openPositions.length }} 项在仓 · {{ closedOnlyCount }} 项已平仓 (共 {{ sortedPositions.length }} 标的)
          </span>
        </div>
      </div>

      <!-- 表格主体 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-100/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold tracking-wider uppercase select-none">
            <tr>
              <th @click="handleSort('sym')" class="p-3 pl-4 sortable hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center gap-1">
                  <span>代码</span>
                  <span :class="['text-[10px]', sortState.open.key === 'sym' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('sym') }}</span>
                </div>
              </th>
              <th class="p-3 text-center w-24">未到期期权</th>
              <th @click="handleSort('qty')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-end gap-1">
                  <span>持仓数量</span>
                  <span :class="['text-[10px]', sortState.open.key === 'qty' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('qty') }}</span>
                </div>
              </th>
              <th @click="handleSort('weight')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition" title="该持仓占当前总持仓本金的百分比">
                <div class="flex items-center justify-end gap-1">
                  <span>仓位占比</span>
                  <span :class="['text-[10px]', sortState.open.key === 'weight' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('weight') }}</span>
                </div>
              </th>
              <th @click="handleSort('avg')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition" title="正股买入的移动平均持仓单价">
                <div class="flex items-center justify-end gap-1">
                  <span>持仓均价</span>
                  <span :class="['text-[10px]', sortState.open.key === 'avg' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('avg') }}</span>
                </div>
              </th>
              <th @click="handleSort('ultimateAvg')" class="p-3 text-right text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-900/20 sortable hover:text-purple-900 transition" title="扣除期权权利金与股息后的真实摊薄单价">
                <div class="flex items-center justify-end gap-1">
                  <span>摊薄成本</span>
                  <span :class="['text-[10px]', sortState.open.key === 'ultimateAvg' ? 'text-purple-900 dark:text-purple-200 font-bold' : 'opacity-40']">{{ getSortIcon('ultimateAvg') }}</span>
                </div>
              </th>
              <th @click="handleSort('realized')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-end gap-1">
                  <span>已实现收益</span>
                  <span :class="['text-[10px]', sortState.open.key === 'realized' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('realized') }}</span>
                </div>
              </th>
              <th @click="handleSort('optPremium')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-end gap-1">
                  <span>期权权利金</span>
                  <span :class="['text-[10px]', sortState.open.key === 'optPremium' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('optPremium') }}</span>
                </div>
              </th>
              <th @click="handleSort('divSum')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-end gap-1">
                  <span>累计股息</span>
                  <span :class="['text-[10px]', sortState.open.key === 'divSum' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('divSum') }}</span>
                </div>
              </th>
              <th @click="handleSort('commSum')" class="p-3 text-right sortable hover:text-slate-900 dark:hover:text-white transition">
                <div class="flex items-center justify-end gap-1">
                  <span>累计佣金</span>
                  <span :class="['text-[10px]', sortState.open.key === 'commSum' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('commSum') }}</span>
                </div>
              </th>
              <th @click="handleSort('combinedPnl')" class="p-3 text-right font-bold sortable hover:text-slate-900 dark:hover:text-white transition" title="已实现收益 + 期权已结权利金 + 净股息税费 (净额已含佣金)">
                <div class="flex items-center justify-end gap-1">
                  <span>综合总收益</span>
                  <span :class="['text-[10px]', sortState.open.key === 'combinedPnl' ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">{{ getSortIcon('combinedPnl') }}</span>
                </div>
              </th>
              <th class="p-3 text-center pr-4">持仓周期</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-mono-num text-slate-700 dark:text-slate-200">
            <template v-for="r in paginatedRows" :key="r.sym">
              <tr
                :class="[
                  'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors',
                  expandedSymbols.has(r.sym) ? 'bg-purple-50/20 dark:bg-purple-900/10' : '',
                  !r.isOpen ? 'opacity-80 bg-slate-50/30 dark:bg-slate-900/20' : ''
                ]"
              >
                <!-- 1. 标的代码与在仓状态标识 -->
                <td class="p-3 pl-4 font-bold">
                  <div class="flex items-center gap-1.5">
                    <button
                      @click="openDetailModal(r.sym)"
                      class="hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                      
                    >
                      <span>{{ r.sym }}</span>
                      
                    </button>
                    <!-- 状态标签 -->
                    <span
                      v-if="!r.isOpen"
                      class="text-[9px] font-sans px-1.5 py-0.5 rounded font-medium bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0"
                    >
                      已平仓
                    </span>
                  </div>
                </td>

                <!-- 2. 期权明细展开按钮 -->
                <td class="p-3 text-center">
                  <button
                    v-if="(r.openOptions || []).length > 0"
                    @click="toggleExpand(r.sym)"
                    class="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/60 px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
                    :title="expandedSymbols.has(r.sym) ? '点击收起期权明细' : '点击展开期权明细'"
                  >
                    {{ (r.openOptions || []).reduce((s, o) => s + Math.abs(o.qty), 0) }} 张
                  </button>
                  <span v-else class="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">0 张</span>
                </td>

                <!-- 3. 持仓股数与成本 (已平仓持仓数为 0) -->
                <td class="p-3 text-right font-semibold">
                  <span v-if="r.isOpen">{{ r.qty.toFixed(2) }}</span>
                  <span v-else class="text-slate-400 dark:text-slate-500 font-normal">0</span>
                </td>

                <td class="p-3 text-right font-medium">
                  <span v-if="r.isOpen" class="text-blue-600 dark:text-blue-400">{{ r.weight.toFixed(2) }}%</span>
                  <span v-else class="text-slate-400 dark:text-slate-500 font-normal">-</span>
                </td>

                <td class="p-3 text-right text-slate-700 dark:text-slate-300">
                  <span v-if="r.isOpen && r.avg !== null && r.avg !== undefined">${{ r.avg.toFixed(2) }}</span>
                  <span v-else class="text-slate-400 dark:text-slate-500">-</span>
                </td>

                <td class="p-3 text-right">
                  <span v-if="r.isOpen && r.ultimateAvg !== null && r.ultimateAvg !== undefined" class="font-bold text-purple-700 dark:text-purple-400 bg-purple-50/40 dark:bg-purple-900/10 px-1 py-0.5 rounded">
                    ${{ r.ultimateAvg.toFixed(2) }}
                  </span>
                  <span v-else class="text-slate-400 dark:text-slate-500">-</span>
                </td>

                <!-- 4. 收益指标 (已平仓标的完整展示已实现收益) -->
                <td :class="['p-3 text-right font-medium', r.realized >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                  {{ r.realized >= 0 ? '+' : '' }}{{ r.realized.toFixed(2) }}
                </td>
                <td :class="['p-3 text-right font-medium', r.optPremium >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                  {{ r.optPremium >= 0 ? '+' : '' }}{{ r.optPremium.toFixed(2) }}
                </td>
                <td class="p-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                  {{ r.divSum > 0 ? '+' + r.divSum.toFixed(2) : '0.00' }}
                </td>
                <td class="p-3 text-right text-slate-500 dark:text-slate-400">
                  -${{ Math.abs(r.commSum).toFixed(2) }}
                </td>
                <td :class="['p-3 text-right font-bold', r.combinedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                  {{ r.combinedPnl >= 0 ? '+' : '' }}${{ r.combinedPnl.toFixed(2) }}
                </td>

                <!-- 5. 建仓日期与持仓周期 -->
                <td class="p-3 text-center pr-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <template v-if="r.isOpen">
                    <div class="truncate">{{ r.firstBuyDate || '-' }}</div>
                    <div class="text-[10px] text-slate-400">持仓 {{ r.holdingDays }} 天</div>
                  </template>
                  <template v-else>
                    <div class="truncate text-slate-400">{{ r.lastCloseDate || r.firstBuyDate || '-' }}</div>
                    <div class="text-[10px] text-slate-400 font-sans" :title="'建仓: ' + r.firstBuyDate + ' 平仓: ' + r.lastCloseDate">
                      历经 {{ r.holdingDays }} 天
                    </div>
                  </template>
                </td>
              </tr>

              <!-- 展开：未到期期权卡片行 (仅在仓期权) -->
              <tr v-if="expandedSymbols.has(r.sym)" class="bg-purple-50/30 dark:bg-purple-950/20 border-b border-purple-200/60 dark:border-purple-800/40">
                <td colspan="12" class="p-4 pl-6">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                    <span class="text-xs font-bold text-purple-900 dark:text-purple-300">
                      {{ r.sym }} 期权持仓 ({{ (r.openOptions || []).reduce((s, o) => s + Math.abs(o.qty), 0) }} 张)
                    </span>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    <div
                      v-for="opt in (r.openOptions || [])"
                      :key="opt.symbol"
                      class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span :class="['px-1.5 py-0.5 rounded text-[10px] font-bold font-mono', opt.type === 'CALL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : opt.type === 'PUT' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-slate-100 text-slate-700']">
                            {{ opt.type }}
                          </span>
                          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                            ${{ opt.strike !== null ? opt.strike.toFixed(2) : 'N/A' }}
                          </span>
                        </div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono truncate" :title="opt.expiryDate || '未知'">
                          到期: {{ opt.expiryDate || '未知' }}
                        </div>
                      </div>

                      <div class="text-right font-mono shrink-0">
                        <div class="text-xs font-bold whitespace-nowrap" :class="opt.qty < 0 ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'">
                          {{ opt.qty > 0 ? `+${opt.qty} 张 (买)` : `${opt.qty} 张 (卖)` }}
                        </div>
                        <div v-if="opt.netPremium !== undefined" class="text-[11px] font-semibold mt-0.5 whitespace-nowrap" :class="opt.netPremium >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                          权利金: {{ opt.netPremium >= 0 ? '+' : '' }}${{ opt.netPremium.toFixed(2) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- 空状态 -->
            <tr v-if="!paginatedRows.length">
              <td colspan="12" class="py-12 text-center text-slate-400 dark:text-slate-500">
                <div class="space-y-2">
                  <div class="text-2xl">🎯</div>
                  <p>暂无符合条件的标的记录</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页控件 -->
      <Pagination
        :total-items="sortedPositions.length"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLedger } from '../../composables/useLedger';
import { isNonSecuritiesItem } from '../../utils/parser';
import Pagination from '../common/Pagination.vue';
import GlobalFilter from '../filter/GlobalFilter.vue';

const {
  openPositions,
  closedPositions,
  sortTable,
  getSortIcon: getSortIconFromLedger,
  sortState,
  openDetailModal
} = useLedger();

function getSortIcon(key: string) {
  return getSortIconFromLedger('open', key);
}

function handleSort(key: string) {
  sortTable('open', key);
}

const searchSymbol = ref('');
const currentPage = ref(1);
const pageSize = ref(20);

// 展开/收起行状态集合
const expandedSymbols = ref<Set<string>>(new Set());

function toggleExpand(sym: string) {
  if (expandedSymbols.value.has(sym)) {
    expandedSymbols.value.delete(sym);
  } else {
    expandedSymbols.value.add(sym);
  }
}

// 统一视图数据行接口
interface PositionDisplayRow {
  sym: string;
  isOpen: boolean; // true 为在仓，false 为已平仓
  qty: number;
  weight: number;
  avg: number | null;
  ultimateAvg: number | null;
  realized: number;
  optPremium: number;
  divSum: number;
  commSum: number;
  combinedPnl: number;
  firstBuyDate: string;
  lastCloseDate?: string;
  holdingDays: number;
  openOptionQty: number;
  openOptions?: any[];
}

// 合并在仓持仓标的与历史已平仓标的 (已平仓标的持仓数为 0 且排在后面)
const allPositionRows = computed<PositionDisplayRow[]>(() => {
  // 1. 当前在仓标的
  const openRows: PositionDisplayRow[] = openPositions.value.map(r => ({
    sym: r.sym,
    isOpen: true,
    qty: r.qty,
    weight: r.weight,
    avg: r.avg,
    ultimateAvg: r.ultimateAvg,
    realized: r.realized,
    optPremium: r.optPremium,
    divSum: r.divSum,
    commSum: r.commSum,
    combinedPnl: r.combinedPnl,
    firstBuyDate: r.firstBuyDate,
    holdingDays: r.holdingDays,
    openOptionQty: r.openOptionQty,
    openOptions: r.openOptions
  }));

  // 避免同一个标的在两边出现 (若在仓则以在仓记录为准)
  const openSymSet = new Set(openRows.map(r => r.sym));

  // 2. 历史已平仓标的 (持仓数为 0，追加在后面)
  const closedRows: PositionDisplayRow[] = closedPositions.value
    .filter(c => !openSymSet.has(c.sym) && !isNonSecuritiesItem(c.sym))
    .map(c => {
      let days = 0;
      if (c.firstBuyDate && c.lastCloseDate) {
        const d1 = new Date(c.firstBuyDate).getTime();
        const d2 = new Date(c.lastCloseDate).getTime();
        if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
          days = Math.max(1, Math.round((d2 - d1) / 86400000));
        }
      }
      return {
        sym: c.sym,
        isOpen: false,
        qty: 0, // 持仓数为 0
        weight: 0,
        avg: null,
        ultimateAvg: null,
        realized: c.realized,
        optPremium: c.optPremium,
        divSum: c.divSum,
        commSum: c.commSum,
        combinedPnl: c.combinedPnl,
        firstBuyDate: c.firstBuyDate,
        lastCloseDate: c.lastCloseDate,
        holdingDays: days,
        openOptionQty: 0,
        openOptions: []
      };
    });

  // 默认当前持仓在前，已平仓标的放在后面
  return [...openRows, ...closedRows];
});

// 计算纯已平仓的标的数
const closedOnlyCount = computed(() => {
  const openSymSet = new Set(openPositions.value.map(r => r.sym));
  return closedPositions.value.filter(c => !openSymSet.has(c.sym)).length;
});

// 关键词过滤
const filteredPositions = computed(() => {
  const kw = searchSymbol.value.trim().toLowerCase();
  if (!kw) return allPositionRows.value;
  return allPositionRows.value.filter(r => r.sym.toLowerCase().includes(kw));
});

// 支持按各字段排序 (默认维持在仓在前、已平仓在后)
const sortedPositions = computed(() => {
  const list = [...filteredPositions.value];
  const s = sortState.open;
  if (!s || !s.key) {
    // 默认保持：在仓 (isOpen: true) 优先排在前面，已平仓 (isOpen: false) 排在后面
    return list;
  }

  const key = s.key;
  const dir = s.asc ? 1 : -1;

  list.sort((a: any, b: any) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir;
    }
    return String(va || '').localeCompare(String(vb || '')) * dir;
  });

  return list;
});

// 当前持仓本金总额计算 (仅统计当前在仓)
const totalCostSum = computed(() => {
  return openPositions.value.reduce((sum, r) => sum + (r.cost || 0), 0);
});

// 分页截取
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedPositions.value.slice(start, start + pageSize.value);
});

watch([pageSize, searchSymbol], () => {
  currentPage.value = 1;
});
</script>
