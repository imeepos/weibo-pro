/**
 * 图表配置优化Hook
 * 解决图表组件中的性能和依赖问题
 */

import { useMemo, useCallback } from 'react';
import { useTheme } from './useTheme';
import type { ChartTheme, EChartsFormatterParams } from '@/types/charts';

/**
 * 从CSS变量获取RGB颜色值
 */
const getCSSVar = (varName: string): string => {
  if (typeof window === 'undefined') return '';
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return rgb ? `rgb(${rgb})` : '';
};

/**
 * 获取主题相关的图表配置
 */
export function useChartTheme(): ChartTheme {
  const { theme } = useTheme();

  return useMemo(() => {
    const backgroundColor = getCSSVar('--color-card');
    const textColor = getCSSVar('--color-card-foreground');
    const gridColor = getCSSVar('--color-border');

    return {
      isDark: theme === 'dark',
      backgroundColor,
      textColor,
      gridColor,
      colors: theme === 'dark'
        ? [
            // 暗色主题 - 明亮色彩
            '#a78bfa', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff',
            '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff',
            '#4ade80', '#6ee7b7', '#86efac', '#a7f3d0', '#d1fae5',
            '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fefce8',
            '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2'
          ]
        : [
            // 亮色主题 - 深色调
            '#7c3aed', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe',
            '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
            '#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0',
            '#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a',
            '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'
          ]
    };
  }, [theme]);
}

/**
 * 通用工具提示格式化器
 */
export function useTooltipFormatter() {
  return useCallback((params: EChartsFormatterParams | EChartsFormatterParams[]) => {
    if (Array.isArray(params)) {
      let result = `${params[0].name}<br/>`;
      params.forEach((param) => {
        result += `<span style="color: ${param.color};">●</span> ${param.seriesName}: ${param.value}<br/>`;
      });
      return result;
    } else {
      return `${params.name}: ${params.value}`;
    }
  }, []);
}

/**
 * 百分比标签格式化器
 */
export function usePercentageFormatter(total: number) {
  return useCallback((params: { value: number | string; name: string }) => {
    const percentage = ((Number(params.value) / total) * 100).toFixed(1);
    return `${params.name}: ${params.value} (${percentage}%)`;
  }, [total]);
}

/**
 * 颜色生成器Hook
 */
export function useColorGenerator() {
  const chartTheme = useChartTheme();
  
  return useCallback((index: number) => {
    return chartTheme.colors[index % chartTheme.colors.length];
  }, [chartTheme.colors]);
}

/**
 * 稳定的数据引用Hook - 避免mockData依赖问题
 */
export function useStableData<T>(data: T): T {
  return useMemo(() => data, [JSON.stringify(data)]);
}

/**
 * 图表基础配置Hook
 */
export function useBaseChartConfig() {
  const chartTheme = useChartTheme();
  
  return useMemo(() => ({
    backgroundColor: chartTheme.backgroundColor,
    textStyle: {
      color: chartTheme.textColor
    },
    grid: {
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '10%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      textStyle: {
        color: '#ffffff'
      }
    }
  }), [chartTheme]);
}

/**
 * 饼图配置Hook
 */
export function usePieChartConfig() {
  const chartTheme = useChartTheme();
  
  return useMemo(() => ({
    backgroundColor: chartTheme.backgroundColor,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      textStyle: {
        color: '#ffffff'
      }
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      textStyle: {
        color: chartTheme.textColor
      }
    }
  }), [chartTheme]);
}

/**
 * 柱状图配置Hook
 */
export function useBarChartConfig() {
  const chartTheme = useChartTheme();
  
  return useMemo(() => ({
    backgroundColor: chartTheme.backgroundColor,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      textStyle: {
        color: '#ffffff'
      }
    },
    grid: {
      left: '15%',
      right: '10%',
      top: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      axisLine: {
        lineStyle: {
          color: chartTheme.gridColor
        }
      },
      axisLabel: {
        color: chartTheme.textColor,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: chartTheme.gridColor
        }
      },
      axisLabel: {
        color: chartTheme.textColor
      }
    }
  }), [chartTheme]);
}