<template>
  <div class="space-y-4">
    <!-- 全局多维数据过滤器 -->
    <GlobalFilter />

    <!-- 交易日历看板 -->
    <div class="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
      <!-- 顶部控制栏 -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-700">
        <!-- 左侧：标题、年份切换与年度总战绩徽标 -->
        <div class="flex items-center gap-3 flex-wrap">
          <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            <span>交易日历</span>
          </h3>

          <!-- 年份切换 -->
          <div v-if="availableYears.length > 1" class="inline-flex p-0.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg border border-slate-200/60 dark:border-slate-600/60">
            <button
              v-for="y in availableYears"
              :key="y"
              @click="selectedCalendarYear = y"
              :class="[
                'px-3 py-1 rounded-md text-xs font-mono font-medium transition cursor-pointer',
                selectedCalendarYear === y
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
            >
              {{ y }}
            </button>
          </div>


          <!-- 年度指标概览 -->
          <button
            v-if="selectedCalendarYear && currentYearRow"
            @click="openYearModal(selectedCalendarYear)"
            class="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-700/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/80 dark:border-slate-600/60 transition cursor-pointer flex flex-wrap items-center gap-2 group select-none shadow-2xs text-xs"
            :title="'点击查看 ' + selectedCalendarYear + ' 年度各标的盈亏明细'"
          >
            <!-- 1. 年已实现净收益 -->
            <div class="flex items-center gap-1">
              <span class="text-slate-500 dark:text-slate-400 font-sans">年已实现:</span>
              <span :class="['font-mono-num font-extrabold text-sm', currentYearTotalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ isPrivacyMode ? '****' : (currentYearTotalPnl >= 0 ? '+' : '') + '$' + currentYearTotalPnl.toFixed(2) }}
              </span>
            </div>

            <div class="h-3 w-px bg-slate-200 dark:bg-slate-600"></div>

            <!-- 股票收益 -->
            <div class="flex items-center gap-1 font-sans">
              <span class="text-slate-500 dark:text-slate-400">股票:</span>
              <span :class="['font-mono-num font-bold', currentYearSummary.stockPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ isPrivacyMode ? '****' : (currentYearSummary.stockPnl >= 0 ? '+' : '') + '$' + currentYearSummary.stockPnl.toFixed(2) }}
              </span>
            </div>

            <div class="h-3 w-px bg-slate-200 dark:bg-slate-600"></div>

            <!-- 3. 期权已结收益 -->
            <div class="flex items-center gap-1 font-sans">
              <span class="text-slate-500 dark:text-slate-400">期权:</span>
              <span :class="['font-mono-num font-bold', currentYearSummary.optPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400']">
                {{ isPrivacyMode ? '****' : (currentYearSummary.optPnl >= 0 ? '+' : '') + '$' + currentYearSummary.optPnl.toFixed(2) }}
              </span>
            </div>

            <div class="h-3 w-px bg-slate-200 dark:bg-slate-600"></div>

            <!-- 4. 股息红利 -->
            <div class="flex items-center gap-1 font-sans">
              <span class="text-slate-500 dark:text-slate-400">股息:</span>
              <span class="font-mono-num font-bold text-amber-600 dark:text-amber-400">
                {{ isPrivacyMode ? '****' : '+$' + currentYearSummary.divPnl.toFixed(2) }}
              </span>
            </div>

            <div class="h-3 w-px bg-slate-200 dark:bg-slate-600"></div>

            <!-- 5. 佣金手续费 -->
            <div class="flex items-center gap-1 font-sans">
              <span class="text-slate-500 dark:text-slate-400">手续费:</span>
              <strong class="text-slate-700 dark:text-slate-200 font-mono-num font-bold">-${{ Math.abs(currentYearTotalComm).toFixed(2) }}</strong>
            </div>

            <!-- 6. 预扣税费 (如有) -->
            <template v-if="Math.abs(currentYearSummary.taxPnl) > 0.01">
              <div class="h-3 w-px bg-slate-200 dark:bg-slate-600"></div>
              <div class="flex items-center gap-1 font-sans">
                <span class="text-slate-500 dark:text-slate-400">税费:</span>
                <strong class="text-rose-500 dark:text-rose-400 font-mono-num font-bold">-${{ Math.abs(currentYearSummary.taxPnl).toFixed(2) }}</strong>
              </div>
            </template>

            <div class="h-3 w-px bg-slate-200 dark:bg-slate-600"></div>

            <!-- 7. 全年成交笔数与涉及标的数 -->
            <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-sans">
              <span>成交:</span>
              <strong class="text-slate-700 dark:text-slate-200 font-mono-num font-bold">{{ currentYearTotalTrades }}笔</strong>
              <span class="opacity-40">/</span>
              <strong class="text-slate-700 dark:text-slate-200 font-mono-num font-bold">{{ currentYearUniqueSymbolsCount }}支</strong>
            </div>
          </button>
        </div>

        <!-- 右侧：活跃统计与 4 阶频次色阶图例 -->
        <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-3 font-mono-num">
            <span>活跃交易: <strong class="text-slate-700 dark:text-slate-200 text-sm">{{ calendarHeatmapData.data.length }}天</strong></span>
            <span>日均: <strong class="text-slate-700 dark:text-slate-200 text-sm">{{ calendarHeatmapData.data.length ? (activeFilteredTrades.length / calendarHeatmapData.data.length).toFixed(1) : '0' }}笔/天</strong></span>
          </div>

          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-700"></div>

          <!-- 红绿双轨 4 阶频次色阶图例 (颜色定盈亏，深浅由分位数等频决定) -->
          <div class="flex items-center gap-3 select-none text-[11px]">
            <div class="flex items-center gap-1">
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">盈利:</span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#dcfce7] border border-[#bbf7d0] inline-block" title="Level 1: 低频盈利"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#86efac] border border-[#4ade80] inline-block" title="Level 2: 常规盈利"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#22c55e] border border-[#16a34a] inline-block" title="Level 3: 高频盈利"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#15803d] border border-[#166534] inline-block" title="Level 4: 极高频盈利"></span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-rose-600 dark:text-rose-400 font-semibold">亏损:</span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#ffe4e6] border border-[#fecdd3] inline-block" title="Level 1: 低频亏损"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#fca5a5] border border-[#f87171] inline-block" title="Level 2: 常规亏损"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#ef4444] border border-[#dc2626] inline-block" title="Level 3: 高频亏损"></span>
              <span class="w-2.5 h-2.5 rounded-xs bg-[#b91c1c] border border-[#991b1b] inline-block" title="Level 4: 极高频亏损"></span>
            </div>
            <span class="text-[10px] text-slate-400">(深浅代表频次)</span>
          </div>

          <div class="h-3.5 w-px bg-slate-200 dark:bg-slate-700"></div>

          <!-- 隐私保护模式开关 (极简纯图标) -->
          <button
            @click="togglePrivacyMode"
            :class="[
              'p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center border select-none shrink-0',
              isPrivacyMode
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60 shadow-2xs'
                : 'bg-slate-100/90 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200/80 dark:border-slate-600/60'
            ]"
            :title="isPrivacyMode ? '隐私模式已开启：点击显示具体数值' : '点击开启隐私保护：隐藏具体收益数值'"
          >
            <!-- 睁眼图标 (当前为明文显示：圆润饱满的标准眼睛与完整眼珠) -->
            <svg v-if="!isPrivacyMode" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <!-- 闭眼/划线图标 (当前为隐私模式：完整居中眼珠，斜线穿过时左下角与右上角眼珠均清晰可见) -->
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <circle cx="12" cy="12" r="3" />
              <line x1="3" y1="3" x2="21" y2="21" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 日历视图滚动容器 -->
      <div class="overflow-x-auto custom-scrollbar pb-2">
        <div class="min-w-[980px] space-y-1">
          <!-- 月度盈亏概览 -->
          <div v-if="activeFilteredTrades.length" class="flex items-center pl-[32px] pr-[18px] w-full font-mono-num select-none gap-1">
            <button
              v-for="m in 12"
              :key="m"
              :style="{ width: monthWidthWeights[m] + '%', ...getMonthCapsuleStyle(m) }"
              @click="openMonthModal(selectedCalendarYear || new Date().getFullYear(), m)"
              :class="[
                'text-center transition flex flex-col items-center justify-center py-1 px-0.5 rounded-lg min-w-0 group',
                getMonthCapsuleClass(m)
              ]"
            >
              <!-- 第一行：月份名 -->
              <span class="text-[11px] font-semibold font-sans leading-tight transition-colors">{{ m }}月</span>
              <!-- 第二行：该月已实现收益 -->
              <span class="text-[11px] font-bold leading-tight truncate max-w-full">
                <template v-if="currentYearMonths[m]?.count">
                  {{ isPrivacyMode ? '****' : (currentYearMonths[m].pnl > 0 ? '+' : '') + Math.round(currentYearMonths[m].pnl) }}
                </template>
                <template v-else>-</template>
              </span>
            </button>
          </div>

          <!-- 日历热力图 -->
          <div>
            <div
              v-show="activeFilteredTrades.length"
              ref="chartContainerEl"
              class="w-full cursor-pointer"
              :style="{ height: (7 * calendarCellSize + 16) + 'px' }"
            ></div>
            <div
              v-if="!activeFilteredTrades.length"
              class="w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/20"
              :style="{ height: (7 * calendarCellSize + 16) + 'px' }"
            >
              <svg class="w-8 h-8 mb-1.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-xs">暂无交易活动数据，请先上传 IBKR 账单</span>
            </div>
          </div>

          <!-- 周度收益刻度 -->
          <div v-if="activeFilteredTrades.length && currentYear53Weeks.length" class="flex items-center pl-[32px] pr-[18px] w-full font-mono-num select-none gap-[2px] pt-1">
            <button
              v-for="w in currentYear53Weeks"
              :key="w.index"
              :style="{ width: (100 / currentYear53Weeks.length) + '%', ...getWeekCapsuleStyle(w) }"
              @click="openWeekModal(w)"
              :class="[
                'text-center transition flex flex-col items-center justify-center py-0.5 px-0.5 rounded-md min-w-0 group',
                getWeekCapsuleClass(w)
              ]"
            >
              <!-- 第一行：周次标识 -->
              <span class="text-[9px] font-semibold font-sans leading-tight transition-colors">W{{ w.index }}</span>
              <!-- 第二行：周已实现收益 (紧凑金额，无交易显示0) -->
              <span class="text-[9px] font-bold leading-tight truncate max-w-full">
                <template v-if="w.count">
                  {{ isPrivacyMode ? '****' : (w.pnl > 0 ? '+' : '') + (Math.abs(w.pnl) >= 1000 ? (w.pnl / 1000).toFixed(1) + 'k' : Math.round(w.pnl)) }}
                </template>
                <template v-else>0</template>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 复盘弹窗 -->
    <div
      v-if="activeRecapModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
      @click.self="activeRecapModal = null"
    >
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700/80 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-scaleUp">
        <!-- 弹窗 Header -->
        <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight">
              {{ activeRecapModal.title }}
            </h3>
          </div>
          <button
            @click="activeRecapModal = null"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        <!-- 弹窗 Body (核心财务指标 + 各标的盈亏清单) -->
        <div class="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          <!-- 核心财务指标卡片 -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <!-- 1. 已实现净收益 (主卡片) -->
            <div class="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between">
              <div>
                <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">已实现净收益</div>
                <div
                  class="text-xl font-extrabold font-mono-num mt-0.5 tracking-tight"
                  :class="activeRecapModal.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                >
                  {{ isPrivacyMode ? '****' : (activeRecapModal.totalPnl >= 0 ? '+' : '') + '$' + activeRecapModal.totalPnl.toFixed(2) }}
                </div>
              </div>
              <div class="text-right text-[11px] text-slate-400 space-y-0.5 font-mono">
                <div>成交 <strong class="text-slate-700 dark:text-slate-200 font-bold">{{ activeRecapModal.totalCount }}</strong> 笔</div>
                <div>标的 <strong class="text-slate-700 dark:text-slate-200 font-bold">{{ activeRecapModal.symbolPnLs.length }}</strong> 支</div>
              </div>
            </div>

            <!-- 2. 股票收益 -->
            <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs flex flex-col justify-between">
              <div class="text-[11px] text-slate-400">股票收益</div>
              <div
                class="text-base font-bold font-mono-num mt-1"
                :class="activeRecapModal.stockPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : (activeRecapModal.stockPnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')"
              >
                {{ isPrivacyMode ? '****' : (activeRecapModal.stockPnl > 0 ? '+' : '') + '$' + activeRecapModal.stockPnl.toFixed(2) }}
              </div>
            </div>

            <!-- 3. 期权收益 -->
            <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs flex flex-col justify-between">
              <div class="text-[11px] text-slate-400">期权收益</div>
              <div
                class="text-base font-bold font-mono-num mt-1"
                :class="activeRecapModal.optPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : (activeRecapModal.optPnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')"
              >
                {{ isPrivacyMode ? '****' : (activeRecapModal.optPnl > 0 ? '+' : '') + '$' + activeRecapModal.optPnl.toFixed(2) }}
              </div>
            </div>

            <!-- 4. 股息收益 -->
            <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs flex flex-col justify-between">
              <div class="text-[11px] text-slate-400">股息收益</div>
              <div
                class="text-base font-bold font-mono-num mt-1"
                :class="activeRecapModal.divPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'"
              >
                {{ isPrivacyMode ? '****' : (activeRecapModal.divPnl > 0 ? '+' : '') + '$' + activeRecapModal.divPnl.toFixed(2) }}
              </div>
            </div>

            <!-- 5. 手续费 -->
            <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs flex flex-col justify-between">
              <div class="text-[11px] text-slate-400">手续费</div>
              <div class="text-base font-bold font-mono-num mt-1 text-slate-700 dark:text-slate-200">
                -${{ Math.abs(activeRecapModal.commission).toFixed(2) }}
              </div>
            </div>

            <!-- 6. 预扣税费 -->
            <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs flex flex-col justify-between">
              <div class="text-[11px] text-slate-400">预扣税费</div>
              <div class="text-base font-bold font-mono-num mt-1 text-slate-700 dark:text-slate-200">
                {{ isPrivacyMode ? '****' : (activeRecapModal.taxPnl !== 0 ? (activeRecapModal.taxPnl < 0 ? '-$' : '+$') + Math.abs(activeRecapModal.taxPnl).toFixed(2) : '$0.00') }}
              </div>
            </div>
          </div>

          <!-- 标的盈亏明细面板 -->
          <div class="border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-800/80 shadow-2xs">
            <div class="px-3.5 py-2.5 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-700/80 flex justify-between items-center">
              <span>标的盈亏</span>
            </div>
            <div class="max-h-80 overflow-y-auto custom-scrollbar">
              <table class="w-full text-xs text-left border-collapse">
                <thead class="bg-slate-50/90 dark:bg-slate-900/70 text-slate-400 text-[10px] font-semibold sticky top-0 backdrop-blur-xs">
                  <tr>
                    <th class="py-2.5 px-3.5">证券标的</th>
                    <th class="py-2.5 px-2 text-center">交易频次</th>
                    <th class="py-2.5 px-3.5 text-right">已实现盈亏</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono-num">
                  <template v-for="item in activeRecapModal.symbolPnLs" :key="item.sym">
                    <!-- 主标的概览行 -->
                    <tr
                      @click="toggleExpandSymbol(item.sym)"
                      class="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer select-none"
                      :class="{ 'bg-slate-50/60 dark:bg-slate-700/30': expandedRecapSym === item.sym }"
                    >
                      <!-- 标的代码与展开指示器 -->
                      <td class="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        <div class="inline-flex items-center gap-1.5 font-mono font-bold text-xs">
                          <span
                            class="transition-transform duration-150 text-[9px] text-slate-400 inline-block"
                            :class="{ 'rotate-90 text-blue-500': expandedRecapSym === item.sym }"
                          >▶</span>
                          <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600">
                            {{ item.sym }}
                          </span>
                        </div>
                      </td>

                      <!-- 交易笔数 -->
                      <td class="py-2.5 px-2 text-center">
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                          {{ item.count }} 笔
                        </span>
                      </td>

                      <!-- 已实现盈亏 -->
                      <td
                        class="py-2.5 px-3.5 text-right font-extrabold text-xs sm:text-[13px]"
                        :class="item.realizedPnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : (item.realizedPnl < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')"
                      >
                        <template v-if="isPrivacyMode">
                          ****
                        </template>
                        <template v-else-if="Math.abs(item.realizedPnl) > 1e-4">
                          {{ item.realizedPnl > 0 ? '+' : '' }}${{ item.realizedPnl.toFixed(2) }}
                        </template>
                        <template v-else>
                          <span class="text-slate-400 font-normal">$0.00</span>
                        </template>
                      </td>
                    </tr>

                    <!-- 展开的成交记录明细列表 -->
                    <tr v-if="expandedRecapSym === item.sym">
                      <td colspan="3" class="p-0 bg-slate-50/70 dark:bg-slate-900/50">
                        <div class="p-3 border-y border-slate-200/80 dark:border-slate-700/80 space-y-2">
                          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                            <span class="font-medium text-slate-700 dark:text-slate-300">成交记录 ({{ item.trades.length }})</span>
                            <button
                              @click.stop="openDetailModal(item.sym)"
                              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700/60 shadow-2xs transition-all duration-150 cursor-pointer text-[10.5px] font-medium group"
                            >
                              <span>持仓明细</span>
                              <svg class="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-60 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M7 17L17 7" />
                                <polyline points="7 7 17 7 17 17" />
                              </svg>
                            </button>
                          </div>

                          <div class="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
                            <table class="w-full text-[11px] text-left">
                              <thead class="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                  <th class="py-1.5 px-2.5">成交时间</th>
                                  <th class="py-1.5 px-2">类型</th>
                                  <th class="py-1.5 px-2">合约/代码</th>
                                  <th class="py-1.5 px-2 text-right">数量</th>
                                  <th class="py-1.5 px-2 text-right">成交价</th>
                                  <th class="py-1.5 px-2 text-right">净额</th>
                                  <th class="py-1.5 px-2.5 text-right">已实现盈亏</th>
                                </tr>
                              </thead>
                              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/40 font-mono-num">
                                <tr
                                  v-for="(t, idx) in item.trades"
                                  :key="idx"
                                  class="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                  <td class="py-1.5 px-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                    {{ t['日期'] }}
                                  </td>
                                  <td class="py-1.5 px-2 whitespace-nowrap">
                                    <span
                                      class="px-1.5 py-0.2 rounded text-[10px] font-medium"
                                      :class="{
                                        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400': String(t['交易类型']).includes('买') || String(t['交易类型']).includes('Buy'),
                                        'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400': String(t['交易类型']).includes('卖') || String(t['交易类型']).includes('Sell'),
                                        'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400': String(t['交易类型']).includes('股息') || String(t['交易类型']).includes('Dividend')
                                      }"
                                    >
                                      {{ t['交易类型'] }}
                                    </span>
                                  </td>
                                  <td class="py-1.5 px-2 font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                    {{ t['代码'] }}
                                  </td>
                                  <td class="py-1.5 px-2 text-right font-mono" :class="(t['数量'] || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : ((t['数量'] || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500')">
                                    {{ t['数量'] != null ? t['数量'] : '-' }}
                                  </td>
                                  <td class="py-1.5 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                                    {{ t['价格'] != null ? '$' + Number(t['价格']).toFixed(2) : '-' }}
                                  </td>
                                  <td class="py-1.5 px-2 text-right font-mono text-slate-600 dark:text-slate-300">
                                    {{ isPrivacyMode ? '****' : (t['净额'] != null ? (t['净额'] >= 0 ? '+' : '') + '$' + Number(t['净额']).toFixed(2) : '-') }}
                                  </td>
                                  <td class="py-1.5 px-2.5 text-right font-mono font-bold" :class="(t._realizedPnl || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : ((t._realizedPnl || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')">
                                    <template v-if="isPrivacyMode">
                                      ****
                                    </template>
                                    <template v-else-if="Math.abs(t._realizedPnl || 0) > 1e-4">
                                      {{ (t._realizedPnl || 0) > 0 ? '+' : '' }}${{ Number(t._realizedPnl).toFixed(2) }}
                                    </template>
                                    <template v-else>
                                      <span class="text-slate-400 font-normal">$0.00</span>
                                    </template>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="!activeRecapModal.symbolPnLs.length">
                    <td colspan="3" class="py-8 text-center text-slate-400 font-normal">
                      该周期无交易记录
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useLedger } from '../../composables/useLedger';
import { useECharts } from '../../composables/useECharts';
import type { EChartsOption } from 'echarts';
import GlobalFilter from '../filter/GlobalFilter.vue';
import { getUnderlyingSymbol, isNonSecuritiesItem, isOptionSymbol } from '../../utils/parser';
import {
  calculateCalendarHeatmapData,
  calculateMonthlyMatrix
} from '../../utils/calculator';
import type { Trade } from '../../types/ledger';

const {
  activeFilteredTrades,
  openPositions,
  closedPositions,
  openDetailModal,
  theme
} = useLedger();

// 隐私保护模式：点击后隐藏具体的收益数值，并记住本地偏好
const isPrivacyMode = ref<boolean>(
  localStorage.getItem('ibkr_calendar_privacy') === 'true'
);

function togglePrivacyMode() {
  isPrivacyMode.value = !isPrivacyMode.value;
  localStorage.setItem('ibkr_calendar_privacy', String(isPrivacyMode.value));
}

const chartContainerEl = ref<HTMLElement | null>(null);

// 动态计算日历方块尺寸
const calendarCellSize = ref(17);
let resizeObserver: ResizeObserver | null = null;

function updateCellSize() {
  const el = chartContainerEl.value;
  if (!el) return;
  const parent = el.parentElement;
  const w = parent?.clientWidth || el.clientWidth || 1000;
  const totalW = Math.max(w, 980);
  // 可用宽度由 53 列等分 (扣除左侧周标 32px 与右侧内边距 18px = 50px)
  const size = Number(((totalW - 50) / 53).toFixed(2));
  if (size >= 10 && Math.abs(calendarCellSize.value - size) >= 0.1) {
    calendarCellSize.value = size;
  }
}

onMounted(() => {
  updateCellSize();
  window.addEventListener('resize', updateCellSize);
  if (chartContainerEl.value) {
    resizeObserver = new ResizeObserver(() => {
      updateCellSize();
    });
    resizeObserver.observe(chartContainerEl.value);
    if (chartContainerEl.value.parentElement) {
      resizeObserver.observe(chartContainerEl.value.parentElement);
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCellSize);
  resizeObserver?.disconnect();
});

// 提取当前筛选结果中包含的所有年份列表 (降序)
const availableYears = computed<number[]>(() => {
  const years = new Set<number>();
  activeFilteredTrades.value.forEach(t => {
    if (t['日期']) {
      const y = parseInt(String(t['日期']).slice(0, 4), 10);
      if (!isNaN(y) && y > 1990 && y < 2100) years.add(y);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
});

// 当前选中的日历查看年份 (默认选最新年份)
const selectedCalendarYear = ref<number | null>(null);

watch(availableYears, (newYears) => {
  if (newYears.length > 0) {
    if (!selectedCalendarYear.value || !newYears.includes(selectedCalendarYear.value)) {
      selectedCalendarYear.value = newYears[0];
    }
  } else {
    selectedCalendarYear.value = null;
  }
}, { immediate: true });

// 1. 日历热力图数据计算
const calendarHeatmapData = computed(() => calculateCalendarHeatmapData(activeFilteredTrades.value));

// 2. 月度 PnL 矩阵计算 (基于 FIFO 成本算法落袋的真实已实现收益)
const monthlyMatrix = computed(() =>
  calculateMonthlyMatrix(activeFilteredTrades.value, closedPositions.value, openPositions.value)
);

// 当前选中年份的各月数据与总计
const currentYearRow = computed(() => {
  if (!selectedCalendarYear.value) return null;
  return monthlyMatrix.value.rows.find(r => r.year === selectedCalendarYear.value) || null;
});

const currentYearMonths = computed<Record<number, { pnl: number; count: number }>>(() => {
  return currentYearRow.value ? currentYearRow.value.months : {};
});

const currentYearTotalPnl = computed(() => {
  return currentYearRow.value ? currentYearRow.value.totalPnl : 0;
});

// 当前选中年份的所有交易 (统一以结算生效日归因)
const currentYearTrades = computed<Trade[]>(() => {
  if (!selectedCalendarYear.value) return [];
  const yPrefix = `${selectedCalendarYear.value}-`;
  return activeFilteredTrades.value.filter(t => {
    const sDate = (t as any)._realizedDate ? String((t as any)._realizedDate) : (t['日期'] ? String(t['日期']) : '');
    return sDate.startsWith(yPrefix);
  });
});

// 当前年份收益汇总与明细拆解
const currentYearSummary = computed(() => {
  let stockPnl = 0;
  let optPnl = 0;
  let divPnl = 0;
  let taxPnl = 0;
  let commSum = 0;

  currentYearTrades.value.forEach(t => {
    const type = String(t['交易类型'] || '');
    if (['存款', '取款', 'Deposit', 'Withdrawal', '其它费用', 'Other Fees'].includes(type)) return;
    const rawSym = String(t['代码'] || '');
    if (isNonSecuritiesItem(rawSym)) return;
    const s = getUnderlyingSymbol(rawSym);
    if (!s || isNonSecuritiesItem(s)) return;

    commSum += Math.abs(Number(t['佣金'] || 0));
    const pnl = Number((t as any)._realizedPnl || 0);

    if (['外国预扣税', 'Withholding Tax'].includes(type)) {
      taxPnl += pnl;
    } else if (['股息', '替代支付', 'Dividend', 'Payment In Lieu'].includes(type)) {
      divPnl += pnl;
    } else if (isOptionSymbol(rawSym)) {
      optPnl += pnl;
    } else {
      stockPnl += pnl;
    }
  });

  return {
    stockPnl,
    optPnl,
    divPnl,
    taxPnl,
    commSum
  };
});

// 全年成交总笔数
const currentYearTotalTrades = computed(() => {
  return currentYearTrades.value.length;
});

// 全年总手续费 (佣金)
const currentYearTotalComm = computed(() => {
  return currentYearSummary.value.commSum;
});

// 全年涉及证券标的数 (排除非证券项)
const currentYearUniqueSymbolsCount = computed(() => {
  const set = new Set<string>();
  currentYearTrades.value.forEach(t => {
    const rawSym = String(t['代码'] || '');
    if (isNonSecuritiesItem(rawSym)) return;
    const s = getUnderlyingSymbol(rawSym);
    if (s && !isNonSecuritiesItem(s)) set.add(s);
  });
  return set.size;
});

// 计算月份所占列宽权重
const monthWidthWeights = computed<Record<number, number>>(() => {
  const yr = selectedCalendarYear.value || new Date().getFullYear();
  const start = new Date(yr, 0, 1);
  const d = new Date(start);
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() - 1);
  }
  const end = new Date(yr, 11, 31);
  while (end.getDay() !== 0) {
    end.setDate(end.getDate() + 1);
  }

  const monthCols: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) monthCols[m] = 0;

  const curr = new Date(d);
  let totalCols = 0;
  while (curr <= end) {
    const thurs = new Date(curr);
    thurs.setDate(thurs.getDate() + 3);
    const m = thurs.getFullYear() === yr ? thurs.getMonth() + 1 : (thurs.getFullYear() < yr ? 1 : 12);
    monthCols[m] = (monthCols[m] || 0) + 1;
    totalCols++;
    curr.setDate(curr.getDate() + 7);
  }

  const weights: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    weights[m] = Number(((monthCols[m] / totalCols) * 100).toFixed(2));
  }
  return weights;
});

// 计算选定年份周度数据
interface WeekColItem {
  index: number;
  year: number;
  startStr: string;
  endStr: string;
  rangeStr: string;
  pnl: number;
  count: number;
  trades: Trade[];
}

const currentYear53Weeks = computed<WeekColItem[]>(() => {
  // 显式建立对 openPositions 和 closedPositions 的响应式依赖，确保 calcCostBasis 完成精准打标后才执行
  const _op = openPositions.value;
  const _cp = closedPositions.value;
  if (!_op && !_cp) return [];

  const yr = selectedCalendarYear.value || new Date().getFullYear();
  const start = new Date(yr, 0, 1);
  const d = new Date(start);
  while (d.getDay() !== 1) {
    d.setDate(d.getDate() - 1);
  }
  const end = new Date(yr, 11, 31);
  while (end.getDay() !== 0) {
    end.setDate(end.getDate() + 1);
  }

  // 按周起止日期过滤交易
  const allTrades = activeFilteredTrades.value;
  const weeks: WeekColItem[] = [];

  const curr = new Date(d);
  let wIndex = 1;

  while (curr <= end) {
    const sun = new Date(curr);
    sun.setDate(sun.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`;
    const endStr = `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`;
    const rangeStr = `${pad(curr.getMonth() + 1)}.${pad(curr.getDate())} - ${pad(sun.getMonth() + 1)}.${pad(sun.getDate())}`;

    // 按结算日期过滤当周交易
    const weekTrades = allTrades.filter(t => {
      const type = String(t['交易类型'] || '');
      if (['存款', '取款', 'Deposit', 'Withdrawal', '其它费用', 'Other Fees'].includes(type)) return false;
      const rawSym = String(t['代码'] || '');
      if (isNonSecuritiesItem(rawSym)) return false;
      const s = getUnderlyingSymbol(rawSym);
      if (!s || isNonSecuritiesItem(s)) return false;

      const sDate = (t as any)._realizedDate ? String((t as any)._realizedDate).slice(0, 10) : String(t['日期'] || '').slice(0, 10);
      return sDate >= startStr && sDate <= endStr;
    });

    let pnl = 0;
    weekTrades.forEach(t => {
      pnl += Number((t as any)._realizedPnl || 0);
    });

    weeks.push({
      index: wIndex,
      year: yr,
      startStr,
      endStr,
      rangeStr,
      pnl,
      count: weekTrades.length,
      trades: weekTrades
    });

    curr.setDate(curr.getDate() + 7);
    wIndex++;
  }

  return weeks;
});

// ==================== 恢复 git 原先经典归一化频次算法 (基于 maxCount 连续归一化) ====================
// A. 日度最大频次与归一化
const maxDailyCount = computed(() => {
  const counts = calendarHeatmapData.value.data.map(([_, c]) => c);
  return Math.max(...counts, 1);
});

// B. 周度最大频次与样式 (还原 git 原先基于比例的连续色深逻辑)
const maxWeeklyCount = computed(() => {
  const counts = currentYear53Weeks.value.map(w => w.count);
  return Math.max(...counts, 1);
});

// 严格基于周度最多交易频次 256 等分极细腻颜色深度 (完美匹配计算机 8-bit 平滑色深)
function getWeeklyLevel(count: number): number {
  if (!count) return 0;
  const ratio = count / maxWeeklyCount.value;
  return Math.min(256, Math.max(1, Math.ceil(ratio * 256)));
}

function getWeekCapsuleStyle(w: WeekColItem): Record<string, string> {
  if (!w.count) return {};
  const level = getWeeklyLevel(w.count);
  // 256 档严格等比透明度：从保底 0.16 到最高 0.98
  const alpha = Number((0.16 + ((level - 1) / 255) * 0.82).toFixed(4));
  const isGain = w.pnl >= 0;
  const bg = isGain ? `rgba(16, 185, 129, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
  return { backgroundColor: bg };
}

function getWeekCapsuleClass(w: WeekColItem): string {
  if (!w.count) {
    return 'cursor-pointer hover:opacity-80 opacity-40 bg-slate-100/70 dark:bg-slate-800/60 text-slate-400';
  }
  const level = getWeeklyLevel(w.count);
  const isGain = w.pnl >= 0;

  // 深度达到中段 (level >= 130) 自动搭配清晰白字，浅色段搭配深字
  if (level >= 130) {
    return 'cursor-pointer hover:z-10 hover:shadow-xs text-white font-semibold';
  } else {
    return isGain
      ? 'cursor-pointer hover:z-10 hover:shadow-xs text-emerald-950 dark:text-emerald-100 font-medium'
      : 'cursor-pointer hover:z-10 hover:shadow-xs text-rose-950 dark:text-rose-100 font-medium';
  }
}

// C. 月度最大频次与样式 (基于月度最多交易频次 256 等分颜色深度)
const maxMonthlyCount = computed(() => {
  const counts = Object.values(currentYearMonths.value).map(m => m.count);
  return Math.max(...counts, 1);
});

function getMonthlyLevel(count: number): number {
  if (!count) return 0;
  const ratio = count / maxMonthlyCount.value;
  return Math.min(256, Math.max(1, Math.ceil(ratio * 256)));
}

function getMonthCapsuleStyle(m: number): Record<string, string> {
  const item = currentYearMonths.value[m];
  if (!item || !item.count) return {};
  const level = getMonthlyLevel(item.count);
  // 256 档严格等比透明度：从保底 0.16 到最高 0.98
  const alpha = Number((0.16 + ((level - 1) / 255) * 0.82).toFixed(4));
  const isGain = item.pnl >= 0;
  const bg = isGain ? `rgba(16, 185, 129, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
  return { backgroundColor: bg };
}

function getMonthCapsuleClass(m: number): string {
  const item = currentYearMonths.value[m];
  if (!item || !item.count) {
    return 'cursor-pointer hover:opacity-80 opacity-40 bg-slate-100/70 dark:bg-slate-800/60 text-slate-400';
  }
  const level = getMonthlyLevel(item.count);
  const isGain = item.pnl >= 0;

  if (level >= 130) {
    return 'cursor-pointer hover:z-10 hover:shadow-xs text-white font-semibold';
  } else {
    return isGain
      ? 'cursor-pointer hover:z-10 hover:shadow-xs text-emerald-950 dark:text-emerald-100 font-medium'
      : 'cursor-pointer hover:z-10 hover:shadow-xs text-rose-950 dark:text-rose-100 font-medium';
  }
}

// ECharts 原生日历配置
const chartOptions = computed<EChartsOption | null>(() => {
  if (!activeFilteredTrades.value.length) return null;

  const rawValues = calendarHeatmapData.value.data;
  let rangeConfig: any = calendarHeatmapData.value.range;
  if (selectedCalendarYear.value) {
    rangeConfig = `${selectedCalendarYear.value}`;
  }

  const countMap = new Map<string, number>(rawValues);
  const maxCount = Math.max(...rawValues.map(([_, count]) => count), 1);
  const dayDetail = calendarHeatmapData.value.dayDetailMap;

  // 保持原本基于 count / maxCount 连续归一化的算法逻辑与色彩
  const normalizedData = rawValues.map(([date, count]) => {
    const dayItem = dayDetail[date];
    const pnl = dayItem ? dayItem.netPnl : 0;
    const ratio = Number((count / maxCount).toFixed(4));
    const signedRatio = pnl >= 0 ? ratio : -ratio;
    return [date, signedRatio];
  });

  // 暗黑模式主题响应式适配
  const isDark = theme.value === 'dark';
  const emptyCellColor = isDark ? '#334155' : '#f8fafc';
  const cellBorderColor = isDark ? '#1e293b' : '#ffffff';
  const dayLabelColor = isDark ? '#64748b' : '#94a3b8';

  return {
    tooltip: {
      show: false
    },
    // 保持原本的 continuous 连续渐变色阶 (支持红绿双轨与频次深度)
    visualMap: {
      min: -1,
      max: 1,
      type: 'continuous',
      show: false,
      inRange: {
        color: [
          '#e11d48', // -1.0 (高频亏损 浓红)
          '#fda4af', // -0.1 (低频亏损 浅粉红)
          emptyCellColor, // 0 (无交易底色)
          '#6ee7b7', // +0.1 (低频盈利 浅翠绿)
          '#059669'  // +1.0 (高频盈利 浓翠绿)
        ]
      }
    },
    calendar: {
      top: 4,
      left: 32,
      cellSize: calendarCellSize.value,
      range: rangeConfig,
      itemStyle: {
        color: emptyCellColor,
        borderWidth: 1.8,
        borderColor: cellBorderColor,
        borderRadius: 2.5
      },
      yearLabel: { show: false },
      monthLabel: { show: false },
      dayLabel: {
        color: dayLabelColor,
        fontSize: 10.5,
        margin: 6,
        fontWeight: 'bold',
        firstDay: 1,
        nameMap: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      }
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: normalizedData
      }
    ]
  };
});

// 点击图表元素回调
function onChartClick(params: any) {
  if (params && params.data && params.data[0]) {
    const dateStr = String(params.data[0]);
    openDayModal(dateStr);
  }
}

useECharts(chartContainerEl, chartOptions, onChartClick);

// 下钻弹窗状态与数据聚合
interface SymbolPnlItem {
  sym: string;
  count: number;
  realizedPnl: number;
  trades: Trade[];
}

interface RecapModalState {
  title: string;
  icon: string;
  totalPnl: number;
  stockPnl: number;
  optPnl: number;
  divPnl: number;
  commission: number;
  taxPnl: number;
  totalCount: number;
  symbolPnLs: SymbolPnlItem[];
}

const activeRecapModal = ref<RecapModalState | null>(null);
const expandedRecapSym = ref<string | null>(null);

function toggleExpandSymbol(sym: string) {
  expandedRecapSym.value = expandedRecapSym.value === sym ? null : sym;
}

// 标的盈亏归因统计
function aggregateSymbolPnLs(trades: Trade[]): {
  totalPnl: number;
  stockPnl: number;
  optPnl: number;
  divPnl: number;
  commission: number;
  taxPnl: number;
  totalCount: number;
  symbolPnLs: SymbolPnlItem[];
} {
  const symMap: Record<string, { count: number; realizedPnl: number; trades: Trade[] }> = {};
  let totalRealized = 0;
  let stockPnl = 0;
  let optPnl = 0;
  let divPnl = 0;
  let commission = 0;
  let taxPnl = 0;

  trades.forEach(t => {
    const type = String(t['交易类型'] || '');
    if (['存款', '取款', 'Deposit', 'Withdrawal', '其它费用', 'Other Fees'].includes(type)) return;

    const rawSym = String(t['代码'] || '');
    if (isNonSecuritiesItem(rawSym)) return;
    const s = getUnderlyingSymbol(rawSym);
    if (!s || isNonSecuritiesItem(s)) return;

    commission += Number(t['佣金'] || 0);

    if (!symMap[s]) {
      symMap[s] = { count: 0, realizedPnl: 0, trades: [] };
    }
    symMap[s].count++;
    symMap[s].trades.push(t);
    const pnl = Number((t as any)._realizedPnl || 0);
    symMap[s].realizedPnl += pnl;
    totalRealized += pnl;

    // 四项收益拆解归因
    if (['外国预扣税', 'Withholding Tax'].includes(type)) {
      taxPnl += pnl;
    } else if (['股息', '替代支付', 'Dividend', 'Payment In Lieu'].includes(type)) {
      divPnl += pnl;
    } else if (isOptionSymbol(rawSym)) {
      optPnl += pnl;
    } else {
      stockPnl += pnl;
    }
  });

  const symbolPnLs: SymbolPnlItem[] = Object.entries(symMap).map(([sym, item]) => ({
    sym,
    count: item.count,
    realizedPnl: item.realizedPnl,
    trades: item.trades.slice().sort((a, b) => {
      const da = String(a['日期'] || '');
      const db = String(b['日期'] || '');
      return db.localeCompare(da);
    })
  })).sort((a, b) => b.realizedPnl - a.realizedPnl);

  return {
    totalPnl: totalRealized,
    stockPnl,
    optPnl,
    divPnl,
    commission,
    taxPnl,
    totalCount: trades.length,
    symbolPnLs
  };
}

// 1. 打开日度复盘 (按实际结算日精准归因)
function openDayModal(dateStr: string) {
  expandedRecapSym.value = null;
  const dayTrades = activeFilteredTrades.value.filter(t => {
    const sDate = (t as any)._realizedDate ? String((t as any)._realizedDate).slice(0, 10) : (t['日期'] ? String(t['日期']).slice(0, 10) : '');
    return sDate === dateStr;
  });

  const result = aggregateSymbolPnLs(dayTrades);
  activeRecapModal.value = {
    title: `${dateStr} 交易复盘`,
    icon: '',
    ...result
  };
}

// 2. 打开周度复盘 (点击热力图下方 53 列中对应的一周，支持 0 笔交易周点击展开)
function openWeekModal(w: WeekColItem) {
  expandedRecapSym.value = null;
  const result = aggregateSymbolPnLs(w.trades || []);
  activeRecapModal.value = {
    title: `${w.year}年 第${w.index}周 (${w.rangeStr}) 周度复盘`,
    icon: '',
    ...result
  };
}

// 3. 打开月度复盘 (按实际结算日归因到对应月份)
function openMonthModal(year: number, month: number) {
  expandedRecapSym.value = null;
  const mPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthTrades = activeFilteredTrades.value.filter(t => {
    const sDate = (t as any)._realizedDate ? String((t as any)._realizedDate) : (t['日期'] ? String(t['日期']) : '');
    return sDate.startsWith(mPrefix);
  });

  const result = aggregateSymbolPnLs(monthTrades);
  activeRecapModal.value = {
    title: `${year}年 ${month}月 复盘总结`,
    icon: '',
    ...result
  };
}

// 4. 打开年度复盘 (按实际结算日归因到对应年度)
function openYearModal(year: number) {
  expandedRecapSym.value = null;
  const yPrefix = `${year}-`;
  const yearTrades = activeFilteredTrades.value.filter(t => {
    const sDate = (t as any)._realizedDate ? String((t as any)._realizedDate) : (t['日期'] ? String(t['日期']) : '');
    return sDate.startsWith(yPrefix);
  });

  const result = aggregateSymbolPnLs(yearTrades);
  activeRecapModal.value = {
    title: `${year} 年度投资年报`,
    icon: '',
    ...result
  };
}
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fadeIn {
  animation: fadeIn 0.15s ease-out forwards;
}

.animate-scaleUp {
  animation: scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
