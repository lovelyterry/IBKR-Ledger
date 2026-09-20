<template>
  <div v-if="isModalOpen" class="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity duration-200">
    <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[85vh]">
      <!-- Modal 头部 Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/80 shrink-0">
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
            {{ modalSymbol }}
          </h3>
        </div>

        <button @click="closeDetailModal" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 flex items-center justify-center text-lg transition cursor-pointer">&times;</button>
      </div>

      <div class="overflow-y-auto p-6 space-y-6">
        <!-- 1. 收益明细卡片 -->
        <div v-if="currentPosition || closedPosition" class="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>收益明细</span>
            <span :class="['font-mono text-sm font-bold', (activePos?.combinedPnl ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
              合计: {{ (activePos?.combinedPnl ?? 0) >= 0 ? '+' : '' }}{{ activePos?.combinedPnl.toFixed(2) }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div class="text-slate-400 text-[11px] mb-1">股票收益</div>
              <div :class="['font-bold text-sm', (activePos?.realized ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ (activePos?.realized ?? 0) >= 0 ? '+' : '' }}{{ activePos?.realized.toFixed(2) }}
              </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div class="text-slate-400 text-[11px] mb-1">期权收益</div>
              <div :class="['font-bold text-sm', (activePos?.optPremium ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ (activePos?.optPremium ?? 0) >= 0 ? '+' : '' }}{{ activePos?.optPremium.toFixed(2) }}
              </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div class="text-slate-400 text-[11px] mb-1">股息收益</div>
              <div :class="['font-bold text-sm', (activePos?.divSum ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ (activePos?.divSum ?? 0) >= 0 ? '+' : '' }}{{ activePos?.divSum.toFixed(2) }}
              </div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div class="text-slate-400 text-[11px] mb-1">预扣税</div>
              <div :class="['font-bold text-sm', (activePos?.taxSum ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ (activePos?.taxSum ?? 0) !== 0 ? activePos?.taxSum.toFixed(2) : '-' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 未平仓期权 (Open Options) 主体内容 -->
        <div class="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
          <div v-if="openOptionsList.length">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <h4 class="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                  在持合约 (共 {{ openOptionsList.reduce((s, o) => s + Math.abs(o.qty), 0) }} 张)
                </h4>
              </div>
              <span class="text-[11px] text-purple-600 dark:text-purple-400 font-mono">包含卖出备兑/买入保护等在持合约</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              <div
                v-for="opt in openOptionsList"
                :key="opt.symbol"
                class="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200/80 dark:border-purple-800/60 shadow-sm flex items-center justify-between gap-3 min-w-0"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span :class="['px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0', opt.type === 'CALL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : opt.type === 'PUT' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-slate-100 text-slate-700']">
                      {{ opt.type }}
                    </span>
                    <span class="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono shrink-0">
                      ${{ opt.strike !== null ? opt.strike.toFixed(2) : 'N/A' }}
                    </span>
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono truncate" :title="opt.expiryDate || '未知'">
                    到期日: <span class="font-semibold text-slate-700 dark:text-slate-300">{{ opt.expiryDate || '未知' }}</span>
                  </div>
                </div>
                <div class="text-right font-mono shrink-0 min-w-0">
                  <div class="text-sm font-bold whitespace-nowrap" :class="opt.qty < 0 ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'">
                    {{ opt.qty > 0 ? `+${opt.qty} 张 (买)` : `${opt.qty} 张 (卖)` }}
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 truncate max-w-[160px]" :title="opt.symbol">
                    {{ opt.symbol }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 无未平仓期权状态 -->
          <div v-else class="py-6 text-center text-slate-400 dark:text-slate-500">
            <div class="text-2xl mb-1">📌</div>
            <p class="text-xs">当前标的暂无未平仓/未到期期权合约</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLedger } from '../../composables/useLedger';

const { isModalOpen, modalSymbol, openPositions, closedPositions, closeDetailModal } = useLedger();

const currentPosition = computed(() => {
  return openPositions.value.find(p => p.sym === modalSymbol.value);
});

const closedPosition = computed(() => {
  return closedPositions.value.find(p => p.sym === modalSymbol.value);
});

const activePos = computed(() => {
  return currentPosition.value || closedPosition.value;
});

const openOptionsList = computed(() => {
  return currentPosition.value?.openOptions || [];
});
</script>
