<template>
  <div class="space-y-4">
    <!-- 全局统一多维数据过滤器 -->
    <GlobalFilter />

    <!-- 交易明细数据表格面板 -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 overflow-hidden">
      <!-- 表格 Header 统计行 -->
      <div class="p-3.5 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            交易明细
          </span>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-mono-num border border-slate-200 dark:border-slate-700">
            共 {{ uniqueSymbolCount }} 标的
          </span>
          <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-mono-num border border-slate-200 dark:border-slate-700">
            共 {{ displayTransactions.length }} 笔记录
          </span>
        </div>
      </div>

      <!-- 表格主体 -->
      <div class="overflow-x-auto w-full">
        <table class="w-full text-left text-xs border-collapse table-fixed">
          <thead class="bg-slate-100/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-medium uppercase tracking-wider">
            <tr>
              <!-- 动态字段列头 -->
              <th
                v-for="h in displayHeaders"
                :key="h"
                @click="sortTable('tx', h)"
                :style="{ width: columnWidthPercentages[h] }"
                :class="[
                  'py-2.5 px-2 sortable hover:text-slate-800 dark:hover:text-slate-200 transition select-none',
                  getColAlign(h)
                ]"
              >
                <div :class="['flex items-center gap-0.5', getColAlign(h) === 'text-right' ? 'justify-end' : (getColAlign(h) === 'text-center' ? 'justify-center' : 'justify-start')]">
                  <span class="truncate" :title="h">{{ h }}</span>
                  <span :class="['text-[10px] shrink-0', sortState.tx.key === h ? 'text-slate-900 dark:text-slate-100 font-bold' : 'opacity-40']">
                    {{ getSortIcon(h) }}
                  </span>
                </div>
              </th>
              <!-- 快捷操作列 -->
              <th :style="{ width: columnWidthPercentages['__action__'] }" class="py-2.5 px-2 text-center shrink-0">操作</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/50 font-mono-num text-slate-700 dark:text-slate-300">
            <tr
              v-for="(t, index) in paginatedRows"
              :key="index"
              class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
            >
              <!-- 动态数据单元格 (自动折叠截断，hover 显示完整内容) -->
              <td
                v-for="h in displayHeaders"
                :key="h"
                :class="[
                  'py-2.5 px-2 overflow-hidden',
                  getColAlign(h)
                ]"
              >
                <!-- 1. 标的代码列：支持点击查看详情弹窗，溢出省略 -->
                <template v-if="isSymbolCol(h) && (t[h] || t['代码'])">
                  <button
                    @click="openDetailModal(getUnderlyingSymbol(t[h] || t['代码']))"
                    class="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-0.5 max-w-full truncate transition-colors cursor-pointer"
                    :title="String(t[h] || t['代码'])"
                  >
                    <span class="truncate" v-html="highlightKeyword(String(t[h] || t['代码']), filterState.symbol)"></span>
                    
                  </button>
                </template>

                <!-- 交易类型列 -->
                <template v-else-if="isTypeCol(h)">
                  <span
                    :class="['px-1.5 py-0.5 rounded text-[10px] font-medium inline-block truncate max-w-full border', getBadgeStyle(t[h] || t['交易类型'])]"
                    :title="t[h] || t['交易类型'] || '-'"
                  >
                    {{ t[h] || t['交易类型'] || '-' }}
                  </span>
                </template>

                <!-- 3. 普通字段：溢出自动截断折叠，Hover tooltip 提示完整内容 -->
                <template v-else>
                  <div class="truncate" :title="getDisplayValue(t, h)">
                    <span v-html="highlightKeyword(getDisplayValue(t, h), filterState.symbol)"></span>
                  </div>
                </template>
              </td>

              <!-- 快捷操作：只看此标的 -->
              <td class="py-2.5 px-2 text-center whitespace-nowrap overflow-hidden">
                <button
                  v-if="t['代码'] && !t['代码'].startsWith('(出入金')"
                  @click="toggleSymbolFilter(getUnderlyingSymbol(t['代码']))"
                  :class="[
                    'px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer',
                    isSymbolSelected(getUnderlyingSymbol(t['代码']))
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                  ]"
                  :title="isSymbolSelected(getUnderlyingSymbol(t['代码'])) ? '取消选择此标的' : '只看此标的'"
                >
                  {{ isSymbolSelected(getUnderlyingSymbol(t['代码'])) ? '取消' : '只看' }}
                </button>
                <span v-else class="text-slate-300 dark:text-slate-600 text-[11px]">-</span>
              </td>
            </tr>

            <!-- 空状态 -->
            <tr v-if="!paginatedRows.length">
              <td :colspan="displayHeaders.length + 1" class="py-12 text-center text-slate-400 dark:text-slate-500">
                <div class="space-y-2">
                  
                  <p>无交易记录</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页控件 -->
      <Pagination
        :total-items="displayTransactions.length"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLedger } from '../../composables/useLedger';
import { getUnderlyingSymbol } from '../../utils/parser';
import Pagination from '../common/Pagination.vue';
import GlobalFilter from '../filter/GlobalFilter.vue';

const {
  displayTransactions,
  rawCSVHeaders,
  filterState,
  applyFilters,
  sortTable,
  getSortIcon: getSortIconFromLedger,
  sortState,
  openDetailModal
} = useLedger();

// 默认兜底列头 (未上传文件或空表头时使用)
const defaultHeaders = [
  '日期', '账户', '说明', '交易类型', '代码', '数量',
  '价格', 'Price Currency', '总额', '佣金', '净额'
];

// 动态全量展示表头：若从 CSV 提取到了表头则优先展示 CSV 所有原样列
const displayHeaders = computed(() => {
  return rawCSVHeaders.value && rawCSVHeaders.value.length > 0
    ? rawCSVHeaders.value
    : defaultHeaders;
});

// 对齐方式判断
function getColAlign(header: string): string {
  const h = header.trim().toLowerCase();
  if (/^(type|交易类型|分类|action|currency|price\s*currency|货币|币种)$/i.test(h)) return 'text-center';
  if (isNumericCol(header)) return 'text-right';
  return 'text-left';
}

function isSymbolCol(header: string): boolean {
  return /^(symbol|代码|标的代码|underlying)$/i.test(header.trim());
}

function isTypeCol(header: string): boolean {
  return /^(type|交易类型|分类|action)$/i.test(header.trim());
}

function isNumericCol(header: string): boolean {
  return /^(quantity|price|amount|commission|net|proceeds|basis|p\/l|数量|价格|总额|佣金|净额|收益|成本)$/i.test(header.trim());
}

function getDisplayValue(row: any, header: string): string {
  if (!row) return '-';
  if (row.rawRow && row.rawRow[header] !== undefined && row.rawRow[header] !== '') {
    return String(row.rawRow[header]);
  }
  if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
    return String(row[header]);
  }
  return '-';
}

// 动态计算列宽分配
const columnWidthPercentages = computed<Record<string, string>>(() => {
  const headers = displayHeaders.value;
  if (!headers.length) return {};

  // 1. 抽取前 60 行数据作为统计样本
  const sampleRows = displayTransactions.value.slice(0, 60);

  // 2. 初始化离屏 Canvas 测量环境
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    if (ctx) ctx.font = '12px "JetBrains Mono", Inter, system-ui, sans-serif';
  } catch {
    ctx = null;
  }

  const measureTextWidth = (text: any): number => {
    if (text === null || text === undefined || text === '') return 0;
    const str = String(text);
    if (ctx) {
      return ctx.measureText(str).width;
    }
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      w += str.charCodeAt(i) > 255 ? 12 : 7.2;
    }
    return w;
  };

  // 3. 计算各列最大测量宽度，并针对业务场景执行极值平滑约束 (Clamp)
  const rawWeights: Record<string, number> = {};
  let sumWeights = 0;

  headers.forEach(h => {
    // 基础宽度：表头文字 + 排序按钮空间 + 内边距
    let maxW = measureTextWidth(h) + 26;

    // 扫描样本行内容测量最长单元格
    for (const r of sampleRows) {
      const val = getDisplayValue(r, h);
      const cellW = measureTextWidth(val) + 16;
      if (cellW > maxW) maxW = cellW;
    }

    // 针对字段特性执行极值平滑约束，防止“说明”等长字段非线性膨胀
    let weight = maxW;
    const hLower = h.toLowerCase();
    if (/^(description|说明|描述)$/i.test(hLower)) {
      // 说明列：压缩权重在 100~135 区间，刚好适度展示，绝不喧宾夺主
      weight = Math.min(Math.max(weight * 0.75, 100), 135);
    } else if (/^(date|日期|trade\s*date)$/i.test(hLower)) {
      weight = Math.min(Math.max(weight, 82), 92);
    } else if (/^(account|账户)$/i.test(hLower)) {
      weight = Math.min(Math.max(weight, 70), 80);
    } else if (/^(type|交易类型|分类|action)$/i.test(hLower)) {
      weight = Math.min(Math.max(weight, 58), 68);
    } else if (/^(symbol|代码|标的代码|underlying)$/i.test(hLower)) {
      weight = Math.min(Math.max(weight, 92), 120);
    } else if (/^(currency|price\s*currency|货币|币种)$/i.test(hLower)) {
      weight = Math.min(Math.max(weight, 46), 56);
    } else if (isNumericCol(h)) {
      weight = Math.min(Math.max(weight, 64), 86);
    } else {
      weight = Math.min(Math.max(weight, 60), 100);
    }

    rawWeights[h] = weight;
    sumWeights += weight;
  });

  // 操作列预留紧凑权重
  const actionWeight = 64;
  sumWeights += actionWeight;

  // 归一化为百分比列宽
  const percentages: Record<string, string> = {};
  headers.forEach(h => {
    percentages[h] = ((rawWeights[h] / sumWeights) * 100).toFixed(2) + '%';
  });
  percentages['__action__'] = ((actionWeight / sumWeights) * 100).toFixed(2) + '%';

  return percentages;
});

function getSortIcon(key: string) {
  return getSortIconFromLedger('tx', key);
}

function isSymbolSelected(sym: string) {
  return filterState.symbol.trim().toLowerCase() === sym.trim().toLowerCase();
}

function toggleSymbolFilter(sym: string) {
  if (isSymbolSelected(sym)) {
    filterState.symbol = '';
  } else {
    filterState.symbol = sym;
  }
  applyFilters();
}

const currentPage = ref(1);
const pageSize = ref(20);

// 计算当前筛选结果中包含的不重复有效标的数
const uniqueSymbolCount = computed(() => {
  const set = new Set<string>();
  displayTransactions.value.forEach(t => {
    const sym = getUnderlyingSymbol(t['代码']);
    if (sym && !sym.startsWith('(出入金')) {
      set.add(sym);
    }
  });
  return set.size;
});

// 关键词高亮
function highlightKeyword(text: string, kw: string) {
  if (!kw || !kw.trim() || !text) return text;
  const escapedKw = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKw})`, 'gi');
  return text.replace(regex, `<mark class="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-1 rounded font-bold">$1</mark>`);
}

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return displayTransactions.value.slice(start, start + pageSize.value);
});

watch(pageSize, () => {
  currentPage.value = 1;
});

function getBadgeStyle(type: string | undefined) {
  if (type === '买' || type === 'Buy') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/60';
  if (type === '卖' || type === 'Sell') return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60';
  if (type === '被行权' || type === '行权' || type === 'Assigned' || type === 'Exercised') return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700/60';
  return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-700';
}
</script>
