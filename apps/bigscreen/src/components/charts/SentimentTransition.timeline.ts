/**
 * 情感转变组件 —— 情感时间线（折线 + 面积图）
 *
 * 拆分为纯函数（option 构建）与副作用（echarts 渲染）两层。
 */
import * as echarts from 'echarts';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import type { EChartThemeColors } from '@sker/ui/hooks/use-echart-theme';
import { formatShortTime } from './SentimentTransition.utils';

/** 时间线三条情感系列配置常量 */
const TIMELINE_SERIES = [
  { name: '正面', color: '#52c41a', areaColor: 'rgba(82, 196, 26, 0.1)' },
  { name: '负面', color: '#ff4d4f', areaColor: 'rgba(255, 77, 79, 0.1)' },
  { name: '中性', color: '#faad14', areaColor: 'rgba(250, 173, 20, 0.1)' },
] as const;

/** 构建情感时间线配置 */
export function buildTimelineOption(data: SentimentTransitionAnalysis, colors: EChartThemeColors) {
  const timestamps = data.timeline.map((t) => formatShortTime(t.timestamp));
  const positive = data.timeline.map((t) => t.positive);
  const negative = data.timeline.map((t) => t.negative);
  const neutral = data.timeline.map((t) => t.neutral);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: {
        color: colors.text,
      },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return '';
        const time = params[0]?.axisValue || '';
        let result = `${time}<br/>`;
        params.forEach((param: any) => {
          const value = param.value?.toLocaleString('zh-CN') || 0;
          result += `${param.marker}${param.seriesName}: ${value}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['正面', '负面', '中性'],
      textStyle: {
        color: colors.text,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
      axisLabel: {
        color: colors.textMuted,
        rotate: 45,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: colors.border,
        },
      },
      axisLabel: {
        color: colors.textMuted,
        formatter: (value: number) => value.toLocaleString('zh-CN'),
      },
      splitLine: {
        lineStyle: {
          color: colors.splitLine,
        },
      },
    },
    series: TIMELINE_SERIES.map((series) => ({
      name: series.name,
      type: 'line',
      data: series.name === '正面' ? positive : series.name === '负面' ? negative : neutral,
      smooth: true,
      itemStyle: { color: series.color },
      lineStyle: { width: 2 },
      areaStyle: {
        color: series.areaColor,
      },
    })),
  };
}

/** 渲染情感时间线 */
export function renderTimelineChart(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: EChartThemeColors,
) {
  const chart = echarts.init(container);
  chart.setOption(buildTimelineOption(data, colors));

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);
}
