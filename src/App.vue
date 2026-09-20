<template>
  <div class="app-layout">
    <!-- 移动端 Drawer 遮罩层 -->
    <div class="drawer-backdrop" :class="{ show: isDrawerOpen }" @click="toggleDrawer"></div>

    <!-- 左侧 Sidebar 抽屉导航 -->
    <Sidebar />

    <!-- 右侧 Main 内容区 -->
    <div class="main-content-container">
      <!-- 顶部 Header -->
      <TopHeader @trigger-upload="triggerFileInput" />

      <!-- 主内容可滚动区域 -->
      <div class="content-scroll-wrapper">
        <!-- 隐藏的文件选择器 -->
        <input type="file" ref="fileInputRef" accept=".csv" class="hidden" @change="onFileChange" />

        <!-- 文件拖拽上传入口 -->
        <div
          v-if="!rawAllTrades.length"
          key="upload-dropzone"
          @click="triggerFileInput"
          @dragover.prevent="isDragActive = true"
          @dragleave="isDragActive = false"
          @drop.prevent="onFileDrop"
          :class="[
            'relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer p-5 sm:p-6 mb-6 group select-none shadow-sm',
            'bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 dark:from-slate-800/80 dark:via-blue-950/20 dark:to-slate-800/60',
            isDragActive
              ? 'border-blue-500 ring-4 ring-blue-500/20 scale-[1.008] shadow-md bg-blue-100/60 dark:bg-blue-900/30'
              : 'border-blue-300/80 dark:border-blue-700/60 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5'
          ]"
        >
          <!-- 背景流动高光装饰 -->
          <div class="absolute -right-12 -top-12 w-36 h-36 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <!-- 左侧：图标与标题文案 -->
            <div class="flex items-center gap-4 text-center sm:text-left">
              <div class="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 dark:group-hover:border-blue-500 shadow-xs transition-all duration-300 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 12v6" />
                  <path d="m9 15 3-3 3 3" />
                </svg>
              </div>

              <div>
                <h3 class="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 justify-center sm:justify-start">
                  <span>点击选择或拖拽 IBKR CSV 交易账单到此处开始复盘</span>
                </h3>
              </div>
            </div>

            <!-- 右侧：格式 Badge -->
            <div class="flex items-center gap-2 shrink-0">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 shadow-2xs group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-colors">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>.CSV 文件</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 主工作区：仅当已上传解析 CSV 账单数据后才展示各个页面内容 -->
        <div v-if="rawAllTrades.length" class="space-y-6">
          <!-- Tab 内容视图动态渲染 -->
          <div id="tabContent">
            <TransactionsTab v-if="activeTab === 'transactions'" key="tab-transactions" />
            <OpenPositionsTab v-else-if="activeTab === 'open-positions'" key="tab-open-positions" />
            <DashboardTab v-else-if="activeTab === 'analytics-behavior'" key="tab-dashboard" />
          </div>
        </div>
      </div>
    </div>

    <!-- 标的交易明细 Modal 弹窗 -->
    <DetailModal />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLedger } from './composables/useLedger';

import TopHeader from './components/layout/TopHeader.vue';
import Sidebar from './components/layout/Sidebar.vue';
import DetailModal from './components/modal/DetailModal.vue';

import TransactionsTab from './components/tabs/TransactionsTab.vue';
import OpenPositionsTab from './components/tabs/OpenPositionsTab.vue';
import DashboardTab from './components/tabs/DashboardTab.vue'; // 交易日历 // 盈亏分布

const { rawAllTrades, activeTab, isDrawerOpen, toggleDrawer, parseCSVFile } = useLedger();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragActive = ref(false);

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    parseCSVFile(target.files[0]);
  }
}

function onFileDrop(e: DragEvent) {
  isDragActive.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    parseCSVFile(e.dataTransfer.files[0]);
  }
}
</script>
