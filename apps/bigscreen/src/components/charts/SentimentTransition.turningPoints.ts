/**
 * 情感转变组件 —— 转折点时间轴（折线 + 散点）
 *
 * 拆分为纯函数（option 构建）与副作用（echarts 渲染）两层。
 */
import * as echarts from 'echarts';
import type { SentimentTransitionAnalysis } from '@sker/sdk';
import type { EChartThemeColors } from '@sker/ui/hooks/use-echart-theme';
import { formatShortTime, formatTime } from './SentimentTransition.utils';

/** 情感中文标签常量 */
export const SENTIMENT_LABELS: Record<string, string> = {
  positive: '正面',
  negative: '负面',
  neutral: '中性',
};

/** 情感配色映射（base 主色，light 淡色阴影），支持主题适配 */
const SENTIMENT_COLOR_MAP: Record<string, { base: (opacity: number) => string; light: string }> = {
  positive: { base: (opacity) => `rgba(34, 197, 94, ${opacity})`, light: 'rgba(34, 197, 94, 0.15)' },
  negative: { base: (opacity) => `rgba(239, 68, 68, ${opacity})`, light: 'rgba(239, 68, 68, 0.15)' },
  neutral: { base: (opacity) => `rgba(156, 163, 175, ${opacity})`, light: 'rgba(156, 163, 175, 0.15)' },
};

const NEUTRAL_FALLBACK = {
  base: (opacity: number) => `rgba(156, 163, 175, ${opacity})`,
  light: 'rgba(156, 163, 175, 0.15)',
};

/** 获取情感对应颜色，未知情感回退到中性色 */
export function getSentimentColor(sentiment: string, opacity = 1): { base: string; light: string } {
  const config = SENTIMENT_COLOR_MAP[sentiment] || NEUTRAL_FALLBACK;
  return {
    base: config.base(opacity),
    light: config.light,
  };
}

/** 构建转折点散点数据 */
function buildTurningPointScatterData(data: SentimentTransitionAnalysis) {
  return data.turningPoints.map((point, index) => {
    const toColor = getSentimentColor(point.toSentiment);
    return {
      name: formatShortTime(point.timestamp),
      value: [index, point.magnitude * 100],
      itemStyle: {
        color: toColor.base,
        borderColor: toColor.base.replace(/[\d.]+\)$/, '0.8)'),
        borderWidth: 2,
        shadowBlur: 8,
        shadowColor: toColor.light,
      },
      fromSentiment: point.fromSentiment,
      toSentiment: point.toSentiment,
      magnitude: point.magnitude,
      confidence: point.confidence,
      timestamp: point.timestamp,
    };
  });
}

/** 构建转折点 tooltip HTML */
function buildTurningPointTooltip(d: any, colors: EChartThemeColors): string {
  const from = SENTIMENT_LABELS[d.fromSentiment] || d.fromSentiment;
  const to = SENTIMENT_LABELS[d.toSentiment] || d.toSentiment;
  const fromColor = getSentimentColor(d.fromSentiment).base;
  const toColor = getSentimentColor(d.toSentiment).base;
  const timeStr = formatTime(d.timestamp);

  let html = `<div style="font-weight:600;margin-bottom:10px;font-size:13px">${timeStr}</div>`;
  html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding:6px 10px;background:rgba(0,0,0,0.05);border-radius:6px">`;
  html += `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${fromColor}"></span>${from}</span>`;
  html += `<span style="color:${colors.textMuted}">→</span>`;
  html += `<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:${toColor}"></span>${to}</span>`;
  html += `</div>`;
  html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">`;
  html += `<span style="color:${colors.textMuted}">幅度</span><span style="font-weight:500">${Math.round(d.magnitude * 100)}%</span>`;
  html += `</div>`;
  if (d.confidence !== undefined) {
    html += `<div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-top:4px">`;
    html += `<span style="color:${colors.textMuted}">置信度</span><span style="font-weight:500">${Math.round(d.confidence * 100)}%</span>`;
    html += `</div>`;
  }
  return html;
}

/** 构建转折点时间轴配置 */
export function buildTurningPointsOption(data: SentimentTransitionAnalysis, colors: EChartThemeColors) {
  const scatterData = buildTurningPointScatterData(data);

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: {
        color: colors.text,
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
      formatter: (params: any) => buildTurningPointTooltip(params.data, colors),
    },
    grid: {
      left: '3%',
      right: '3%',
      top: '18%',
      bottom: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: scatterData.map((d) => d.name),
      axisLine: {
        show: true,
        lineStyle: {
          color: colors.border,
          width: 1,
        },
      },
      axisLabel: {
        color: colors.textMuted,
        rotate: 0,
        fontSize: 11,
        margin: 12,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: '转变幅度',
      nameTextStyle: {
        color: colors.textMuted,
        fontSize: 11,
        padding: [0, 0, 8, 0],
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: colors.textMuted,
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: {
        lineStyle: {
          color: colors.splitLine,
          type: 'dashed',
          opacity: 0.6,
        },
      },
    },
    series: [
      {
        type: 'line',
        data: scatterData.map((d) => d.value[1]),
        smooth: 0.3,
        showSymbol: false,
        lineStyle: {
          color: colors.border,
          width: 1.5,
          type: 'dashed',
          opacity: 0.5,
        },
        z: 0,
      },
      {
        type: 'scatter',
        symbolSize: (val: number[]) => {
          // 更小、更精致的圆点，基于幅度动态调整
          const base = 10;
          const scale = Math.min(val[1] / 100, 1) * 6;
          return base + scale;
        },
        data: scatterData,
        label: {
          show: true,
          position: 'top',
          distance: 8,
          formatter: (params: any) => {
            const d = params.data;
            const from = SENTIMENT_LABELS[d.fromSentiment]?.[0] || '?';
            const to = SENTIMENT_LABELS[d.toSentiment]?.[0] || '?';
            return `{from|${from}}{arrow|→}{to|${to}}`;
          },
          rich: {
            from: {
              fontSize: 10,
              color: colors.textMuted,
              padding: [0, 2, 0, 0],
            },
            arrow: {
              fontSize: 10,
              color: colors.textMuted,
              padding: [0, 2],
            },
            to: {
              fontSize: 10,
              fontWeight: 500,
              color: colors.text,
              padding: [0, 0, 0, 2],
            },
          },
        },
        emphasis: {
          scale: 1.3,
          itemStyle: {
            shadowBlur: 12,
          },
        },
        z: 1,
      },
    ],
  };
}

/** 渲染转折点时间轴 */
export function renderTurningPointsTimeline(
  data: SentimentTransitionAnalysis,
  container: HTMLElement,
  colors: EChartThemeColors,
) {
  const chart = echarts.init(container);
  chart.setOption(buildTurningPointsOption(data, colors));

  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);
}
