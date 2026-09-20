<template>
  <nav :class="['sidebar-drawer', isDrawerOpen ? 'open' : '', isSidebarCollapsed ? 'collapsed' : '']">
    <!-- 侧边栏头部 Header -->
    <div class="sidebar-header">
      <div class="sidebar-header-left">
        <div class="brand-logo-mini">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L4 26H28L16 2Z" fill="url(#sideLogoGrad)"/>
            <defs>
              <linearGradient id="sideLogoGrad" x1="4" y1="2" x2="28" y2="26" gradientUnits="userSpaceOnUse">
                <stop stop-color="#3B82F6"/>
                <stop offset="1" stop-color="#8B5CF6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="sidebar-title">IBKR LEAGER</h1>
        
      </div>
      <button class="sidebar-toggle-btn" @click="toggleSidebarCollapse" :title="isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'">
        <svg class="toggle-icon" :class="{ rotated: isSidebarCollapsed }" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect>
          <path d="M15 9l-3 3 3 3"></path>
        </svg>
      </button>
    </div>

    <!-- 侧边栏主导航 Nav Items (已删除分组小字，按钮整齐清爽排列) -->
    <div class="sidebar-nav space-y-2">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeTab === item.id }"
        @click="switchTab(item.id)"
        :title="isSidebarCollapsed ? item.label : ''"
      >
        <span class="nav-item-icon">
          <!-- 交易日历 (Calendar) -->
          <svg v-if="item.id === 'analytics-behavior'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <!-- 持仓详情 (BarChart 仓位与资产柱状图，直观清晰，绝无视觉歧义) -->
          <svg v-else-if="item.id === 'open-positions'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <!-- 交易明细 (List 逐笔明细清单列表) -->
          <svg v-else-if="item.id === 'transactions'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </span>
        <span>{{ item.label }}</span>
        <span v-if="item.badge !== undefined" class="nav-badge text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono-num ml-auto">
          {{ item.badge }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLedger } from '../../composables/useLedger';
import type { TabName } from '../../types/ledger';

const {
  activeTab,
  isSidebarCollapsed,
  isDrawerOpen,
  toggleSidebarCollapse,
  switchTab,
  activeFilteredTrades,
  openPositions
} = useLedger();

// 合并导航按钮，移除多余的小字分类标签
const navItems = computed<{ id: TabName; label: string; icon: string; badge?: number }[]>(() => [
  { id: 'analytics-behavior', label: '交易日历', icon: '' },
  { id: 'open-positions', label: '持仓详情', icon: '', badge: openPositions.value.length },
  { id: 'transactions', label: '交易明细', icon: '', badge: activeFilteredTrades.value.length }
]);
</script>
