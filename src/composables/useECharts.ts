import { onMounted, onUnmounted, nextTick, watch, type Ref } from 'vue';
import * as echarts from 'echarts';

export function useECharts(
  elRef: Ref<HTMLElement | null>,
  optionsRef: Ref<echarts.EChartsOption | null>,
  onClick?: (params: any) => void
) {
  let chartInstance: echarts.ECharts | null = null;

  function bindEvents() {
    if (!chartInstance || !onClick) return;
    chartInstance.off('click');
    chartInstance.on('click', onClick);
  }

  async function renderChart() {
    await nextTick();
    if (!elRef.value) return;

    if (!chartInstance) {
      chartInstance = echarts.init(elRef.value);
      bindEvents();
    }

    if (optionsRef.value) {
      chartInstance.setOption(optionsRef.value, true);
      // 延迟微任务确保 DOM 容器尺寸已由布局引擎完全计算
      setTimeout(() => {
        chartInstance?.resize();
      }, 0);
    }
  }

  function handleResize() {
    if (chartInstance) {
      chartInstance.resize();
    }
  }

  watch(optionsRef, () => {
    renderChart();
  }, { deep: true });

  watch(elRef, () => {
    renderChart();
  });

  onMounted(() => {
    renderChart();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
  });

  return {
    chartInstance,
    resize: handleResize
  };
}
