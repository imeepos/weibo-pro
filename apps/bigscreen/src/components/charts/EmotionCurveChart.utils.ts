import type { EChartsFormatterParams } from '@/types/charts';

export type EmotionType = 'all' | 'positive' | 'negative' | 'neutral';

export interface EmotionCurveData {
  hours: string[];
  positiveData: number[];
  negativeData: number[];
  neutralData: number[];
}

// 情感类型按钮配置
export const emotionTypes = [
  { key: 'all', label: '全部', color: '#3b82f6', icon: '◇' },
  { key: 'positive', label: '正面', color: '#10b981', icon: '◇' },
  { key: 'negative', label: '负面', color: '#ef4444', icon: '◇' },
  { key: 'neutral', label: '中性', color: '#6b7280', icon: '◇' }
] as const;

// 构建单条情感序列
function buildSentimentSeries(
  name: string,
  color: string,
  data: number[],
  isFocused: boolean,
) {
  return {
    name,
    type: 'line',
    data,
    smooth: true,
    lineStyle: {
      color,
      width: 3,
      shadowColor: `rgba(${hexToRgb(color)}, 0.3)`,
      shadowBlur: 10
    },
    itemStyle: {
      color,
      borderWidth: 2,
      borderColor: '#ffffff'
    },
    areaStyle: isFocused ? {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: `rgba(${hexToRgb(color)}, 0.3)` },
          { offset: 1, color: `rgba(${hexToRgb(color)}, 0.05)` }
        ]
      }
    } : undefined,
    symbol: 'circle',
    symbolSize: 8
  };
}

// 将十六进制颜色转换为 rgb 字符串
function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized;
  const num = parseInt(full, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

export interface BuildEmotionChartOptionParams extends EmotionCurveData {
  selectedType: EmotionType;
  isDark: boolean;
}

// 构建图表配置
export function buildEmotionChartOption({
  hours,
  positiveData,
  negativeData,
  neutralData,
  selectedType,
  isDark,
}: BuildEmotionChartOptionParams) {
  // 无有效数据时返回占位配置
  if (!hours.length || (!positiveData.length && !negativeData.length && !neutralData.length)) {
    return {
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'middle',
        textStyle: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 14
        }
      }
    };
  }

  const series: unknown[] = [];

  if (selectedType === 'all' || selectedType === 'positive') {
    series.push(buildSentimentSeries('正面', '#10b981', positiveData, selectedType === 'positive'));
  }

  if (selectedType === 'all' || selectedType === 'negative') {
    series.push(buildSentimentSeries('负面', '#ef4444', negativeData, selectedType === 'negative'));
  }

  if (selectedType === 'all' || selectedType === 'neutral') {
    series.push(buildSentimentSeries('中性', '#6b7280', neutralData, selectedType === 'neutral'));
  }

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      textStyle: {
        color: '#ffffff',
      },
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: EChartsFormatterParams[]) => {
        let result = `${params[0]?.name}<br/>`;
        params.forEach((param) => {
          result += `<span style="color: ${param.color};">●</span> ${param.seriesName}: ${param.value}<br/>`;
        });
        return result;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: hours,
      axisLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb'
        }
      },
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 12
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      name: '数量',
      nameTextStyle: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb'
        }
      },
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        formatter: '{value}'
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb',
          type: 'dashed'
        }
      }
    },
    series
  };
}
