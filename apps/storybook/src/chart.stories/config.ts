import type { ChartConfig } from '@sker/ui/components/ui/chart'

/**
 * Chart stories 的 chart 配置
 * 统一维护各 story 中重复出现的 config 对象
 */

/** 通用图表配置：微博数量 + 三种情感 */
export const chartConfig = {
  count: {
    label: '微博数量',
    color: 'var(--chart-1)',
  },
  positive: {
    label: '正面',
    color: 'var(--chart-1)',
  },
  negative: {
    label: '负面',
    color: 'var(--chart-3)',
  },
  neutral: {
    label: '中性',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

/** 情感分布饼图配置 */
export const sentimentConfig = {
  positive: { label: '正面', color: 'var(--chart-1)' },
  neutral: { label: '中性', color: 'var(--chart-2)' },
  negative: { label: '负面', color: 'var(--chart-3)' },
} satisfies ChartConfig

/** 10 色板配置（用于展示全部图表颜色） */
export const colorConfig = {
  color1: { label: 'Color 1', color: 'var(--chart-1)' },
  color2: { label: 'Color 2', color: 'var(--chart-2)' },
  color3: { label: 'Color 3', color: 'var(--chart-3)' },
  color4: { label: 'Color 4', color: 'var(--chart-4)' },
  color5: { label: 'Color 5', color: 'var(--chart-5)' },
  color6: { label: 'Color 6', color: 'var(--chart-6)' },
  color7: { label: 'Color 7', color: 'var(--chart-7)' },
  color8: { label: 'Color 8', color: 'var(--chart-8)' },
  color9: { label: 'Color 9', color: 'var(--chart-9)' },
  color10: { label: 'Color 10', color: 'var(--chart-10)' },
} satisfies ChartConfig
