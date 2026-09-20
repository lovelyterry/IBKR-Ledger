<template>
  <div class="relative inline-block w-full sm:w-60" ref="pickerRef">
    <!-- 触发按钮 -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      class="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 font-medium hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-xs cursor-pointer select-none"
    >
      <div class="flex items-center gap-1.5 min-w-0">
        <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>

        <div class="flex items-center gap-1 font-mono-num text-[11px]">
          <span class="text-center inline-block truncate" :class="startDate ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-400'">
            {{ startDate || 'YYYY-MM-DD' }}
          </span>
          <span class="text-slate-400 text-[10px] shrink-0">~</span>
          <span class="text-center inline-block truncate" :class="endDate ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-400'">
            {{ endDate || 'YYYY-MM-DD' }}
          </span>
        </div>
      </div>

      <!-- 右侧图标固定容器 -->
      <div class="w-4 h-4 flex items-center justify-center shrink-0">
        <span
          v-if="startDate || endDate"
          @click.stop="handleClear"
          class="p-0.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          title="清除日期区间"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <svg v-else class="w-3 h-3 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- 下拉自定弹出日历面板 (Popover Calendar Card) -->
    <div
      v-if="isOpen"
      class="absolute left-0 mt-2 z-50 w-60 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- 日期直接输入框与提示 -->
      <div class="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <input
          type="text"
          v-model="tempStart"
          placeholder="YYYY-MM-DD"
          class="w-full text-center text-xs font-mono-num bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span class="text-slate-400 text-xs">~</span>
        <input
          type="text"
          v-model="tempEnd"
          placeholder="YYYY-MM-DD"
          class="w-full text-center text-xs font-mono-num bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <!-- 月份切换 Header -->
      <div class="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          @click="prevMonth"
          class="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono-num">
          {{ viewYear }}年 {{ viewMonth + 1 }}月
        </span>
        <button
          type="button"
          @click="nextMonth"
          class="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- 星期表头 -->
      <div class="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-medium text-slate-400">
        <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
      </div>

      <!-- 日历网格 -->
      <div class="grid grid-cols-7 gap-1 text-xs mb-3 font-mono-num">
        <!-- 填充上个月空格 -->
        <span v-for="n in firstDayOfWeek" :key="'blank-' + n"></span>

        <!-- 本月各天 -->
        <button
          v-for="day in daysInMonth"
          :key="day"
          type="button"
          @click="selectDay(day)"
          @mouseenter="hoverDay = formatDateStr(viewYear, viewMonth, day)"
          @mouseleave="hoverDay = ''"
          :class="[
            'h-7 rounded-lg flex items-center justify-center transition text-[11px] font-medium relative',
            getDayClass(formatDateStr(viewYear, viewMonth, day))
          ]"
        >
          {{ day }}
        </button>
      </div>

      <!-- 底部操作按钮 -->
      <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
        <button
          type="button"
          @click="handleClear"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium px-2 py-1 transition"
        >
          清空
        </button>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="isOpen = false"
            class="px-2.5 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            取消
          </button>
          <button
            type="button"
            @click="confirmSelection"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-xs transition"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  startDate?: string;
  endDate?: string;
}>();

const emit = defineEmits<{
  (e: 'update:startDate', val: string): void;
  (e: 'update:endDate', val: string): void;
  (e: 'change'): void;
}>();

const pickerRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const tempStart = ref(props.startDate || '');
const tempEnd = ref(props.endDate || '');
const hoverDay = ref('');

// 当前视图中的年月
const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth());

watch(() => props.startDate, (val) => {
  tempStart.value = val || '';
  if (val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      viewYear.value = d.getFullYear();
      viewMonth.value = d.getMonth();
    }
  }
});

watch(() => props.endDate, (val) => {
  tempEnd.value = val || '';
});

// 日历天数计算
const daysInMonth = computed(() => {
  return new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
});

const firstDayOfWeek = computed(() => {
  return new Date(viewYear.value, viewMonth.value, 1).getDay();
});

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value -= 1;
  } else {
    viewMonth.value -= 1;
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value += 1;
  } else {
    viewMonth.value += 1;
  }
}

function formatDateStr(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function selectDay(day: number) {
  const dateStr = formatDateStr(viewYear.value, viewMonth.value, day);

  if (!tempStart.value || (tempStart.value && tempEnd.value)) {
    tempStart.value = dateStr;
    tempEnd.value = '';
  } else if (tempStart.value && !tempEnd.value) {
    if (dateStr >= tempStart.value) {
      tempEnd.value = dateStr;
    } else {
      tempEnd.value = tempStart.value;
      tempStart.value = dateStr;
    }
  }
}

function getDayClass(dateStr: string) {
  const start = tempStart.value;
  const end = tempEnd.value;
  const hover = hoverDay.value;

  const isStart = dateStr === start;
  const isEnd = dateStr === end;

  if (isStart || isEnd) {
    return 'bg-blue-600 text-white font-bold shadow-xs';
  }

  if (start && end && dateStr > start && dateStr < end) {
    return 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold';
  }

  if (start && !end && hover && dateStr > start && dateStr <= hover) {
    return 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
  }

  return 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';
}

function confirmSelection() {
  emit('update:startDate', tempStart.value);
  emit('update:endDate', tempEnd.value);
  emit('change');
  isOpen.value = false;
}

function handleClear() {
  tempStart.value = '';
  tempEnd.value = '';
  emit('update:startDate', '');
  emit('update:endDate', '');
  emit('change');
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (pickerRef.value && !pickerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
