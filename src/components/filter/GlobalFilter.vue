<template>
  <div class="bg-white dark:bg-slate-800 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-3">
    <!-- 过滤器布局 -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <!-- 常用筛选选项 -->
      <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
        <!-- 1. 标的代码检索 -->
        <div class="relative col-span-2 sm:col-span-1 sm:w-40 md:w-44 shrink-0">
          <input
            type="text"
            v-model="filterState.symbol"
            @input="debouncedApplyFilters"
            placeholder="搜索代码 (NVDA, SGOV...)"
            class="w-full text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl pl-7 pr-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- 2. 自定义日期区间选择器 -->
        <div class="col-span-2 sm:col-span-1 sm:w-56 md:w-60 shrink-0">
          <DateRangePicker
            v-model:startDate="filterState.startDate"
            v-model:endDate="filterState.endDate"
            @change="applyFilters"
          />
        </div>

        <!-- 3. 交易分类 -->
        <div class="relative col-span-1 sm:w-32 md:w-36 shrink-0">
          <select
            v-model="filterState.tradeType"
            @change="applyFilters"
            class="w-full text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-7 truncate"
          >
            <option value="all">全部分类</option>
            <option v-for="tType in tradeTypeOptions" :key="tType" :value="tType">{{ tType }}</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- 4. 交易账户 (多账户时显示) -->
        <div v-if="accountOptions.length > 1" class="relative col-span-1 sm:w-32 md:w-36 shrink-0">
          <select
            v-model="filterState.account"
            @change="applyFilters"
            class="w-full text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none cursor-pointer pr-7 truncate"
          >
            <option value="all">全部账户</option>
            <option v-for="acc in accountOptions" :key="acc" :value="acc">{{ acc }}</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 右侧/下排：快捷时间 Pills 与 重置按钮组 (手机端横向滚动/换行) -->
      <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t border-slate-100 dark:border-slate-700/50 lg:border-t-0">
        <!-- 快捷时间范围 -->
        <div class="flex items-center bg-slate-100/80 dark:bg-slate-700/60 p-0.5 rounded-xl gap-0.5 border border-slate-200/50 dark:border-slate-600/50 overflow-x-auto max-w-[calc(100vw-120px)] sm:max-w-none no-scrollbar">
          <button
            v-for="btn in quickDateBtns"
            :key="btn.type"
            @click="selectQuickDate(btn.type)"
            :class="[
              'px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0',
              activeQuickDate === btn.type
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-600'
            ]"
          >
            {{ btn.label }}
          </button>
        </div>

        <!-- 重置按钮 -->
        <button
          @click="onReset"
          class="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-700/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition font-medium border border-slate-200 dark:border-slate-600 flex items-center gap-1 cursor-pointer shrink-0"
          title="重置所有过滤器"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>重置</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLedger } from '../../composables/useLedger';
import DateRangePicker from '../common/DateRangePicker.vue';

const { filterState, accountOptions, tradeTypeOptions, applyFilters, resetFilters, setQuickDateRange } = useLedger();

const activeQuickDate = ref<'all' | 'ytd' | '3m' | '1m' | '1w' | 'today'>('all');

const quickDateBtns = [
  { type: 'all' as const, label: '全部' },
  { type: 'ytd' as const, label: '今年' },
  { type: '3m' as const, label: '近3月' },
  { type: '1m' as const, label: '近1月' },
  { type: '1w' as const, label: '近1周' },
  { type: 'today' as const, label: '当日' }
];

function selectQuickDate(type: 'all' | 'ytd' | '3m' | '1m' | '1w' | 'today') {
  activeQuickDate.value = type;
  setQuickDateRange(type);
}

function onReset() {
  activeQuickDate.value = 'all';
  resetFilters();
}

let timer: any = null;
function debouncedApplyFilters() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    applyFilters();
  }, 250);
}
</script>
