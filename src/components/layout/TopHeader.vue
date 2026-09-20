<template>
  <header class="top-app-bar">
    <!-- 左侧：菜单按钮 & 当前 Tab 标题 -->
    <div class="flex items-center gap-2 sm:gap-3 min-w-0">
      <!-- 移动端 Drawer 打开按钮 -->
      <button
        class="lg:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        @click="toggleDrawer"
        title="打开菜单"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="18" x2="20" y2="18"></line>
        </svg>
      </button>

      <div class="flex items-center gap-2 min-w-0">
        <span class="text-slate-600 dark:text-slate-300 select-none shrink-0 flex items-center">
          <!-- 交易日历 (Calendar) -->
          <svg v-if="activeTab === 'analytics-behavior'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <!-- 持仓详情 (BarChart 仓位与资产柱状图) -->
          <svg v-else-if="activeTab === 'open-positions'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <!-- 交易明细 (List 逐笔明细清单列表) -->
          <svg v-else-if="activeTab === 'transactions'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </span>
        <h1 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
          {{ currentTabInfo.label }}
        </h1>
      </div>
    </div>

    <!-- 右侧：状态指示、文件名 & 更换文件按钮 -->
    <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
      <!-- 已解析记录条数 Badge (中大屏展示) -->
      <div
        v-if="rawAllTrades.length"
        class="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-medium"
      >
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>已解析 {{ rawAllTrades.length }} 笔记录</span>
      </div>

      <!-- 文件名 Tag (手机端隐藏，桌面端展示完整) -->
      <span
        v-if="fileName"
        class="hidden sm:inline-block text-xs text-slate-500 dark:text-slate-400 font-mono-num px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 sm:max-w-[300px] md:max-w-none truncate"
        :title="fileName"
      >
        {{ fileName }}
      </span>

      <!-- 更换文件按钮 -->
      <button
        v-if="fileName"
        @click="$emit('trigger-upload')"
        class="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
        title="更换 IBKR CSV 文件"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
        </svg>
        <span>更换文件</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLedger } from '../../composables/useLedger';

defineEmits(['trigger-upload']);

const { activeTab, toggleDrawer, fileName, rawAllTrades } = useLedger();

const tabMap: Record<string, { label: string; icon: string }> = {
  transactions: { label: '交易明细', icon: '' },
  'analytics-behavior': { label: '交易日历', icon: '' },
  'open-positions': { label: '持仓详情', icon: '' }
};

const currentTabInfo = computed(() => {
  return tabMap[activeTab.value] || { label: '交易复盘', icon: '📊' };
});
</script>
