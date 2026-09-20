<template>
  <div class="px-4 py-3 border-t border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3 text-xs">
    <!-- 左侧统计与每页条数选择 -->
    <div class="flex items-center gap-3 text-slate-500 dark:text-slate-400">
      <span>显示 {{ startItem }} - {{ endItem }} 条，共 <b class="text-slate-800 dark:text-slate-200 font-mono-num">{{ totalItems }}</b> 条记录</span>
      <div class="flex items-center gap-1.5 ml-2">
        <span>每页:</span>
        <select
          :value="pageSize"
          @change="$emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
          class="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          <option :value="10">10 条</option>
          <option :value="20">20 条</option>
          <option :value="50">50 条</option>
          <option :value="100">100 条</option>
        </select>
      </div>
    </div>

    <!-- 右侧分页控制按钮 -->
    <div class="flex items-center gap-1.5">
      <button
        @click="$emit('update:currentPage', 1)"
        :disabled="currentPage <= 1"
        class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
      >
        首页
      </button>
      <button
        @click="$emit('update:currentPage', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
      >
        上一页
      </button>

      <span class="px-2 font-mono-num font-semibold text-slate-700 dark:text-slate-300">
        {{ currentPage }} / {{ totalPages || 1 }}
      </span>

      <button
        @click="$emit('update:currentPage', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
      >
        下一页
      </button>
      <button
        @click="$emit('update:currentPage', totalPages)"
        :disabled="currentPage >= totalPages"
        class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
      >
        末页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  totalItems: number;
  currentPage: number;
  pageSize: number;
}>();

defineEmits(['update:currentPage', 'update:pageSize']);

const totalPages = computed(() => Math.ceil(props.totalItems / props.pageSize));
const startItem = computed(() => props.totalItems ? (props.currentPage - 1) * props.pageSize + 1 : 0);
const endItem = computed(() => Math.min(props.currentPage * props.pageSize, props.totalItems));
</script>
