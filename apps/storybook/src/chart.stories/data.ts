/**
 * Chart stories 的 mock 数据
 * 与业务无关，仅用于展示各图表组件的渲染效果
 */

export const trendData = [
  { date: '01-15', count: 234 },
  { date: '01-16', count: 456 },
  { date: '01-17', count: 389 },
  { date: '01-18', count: 612 },
  { date: '01-19', count: 523 },
  { date: '01-20', count: 789 },
  { date: '01-21', count: 645 },
]

export const eventData = [
  { name: '正面', value: 342, fill: 'var(--chart-1)' },
  { name: '中性', value: 256, fill: 'var(--chart-2)' },
  { name: '负面', value: 128, fill: 'var(--chart-3)' },
]

export const multiLineData = [
  { date: '01-15', positive: 123, negative: 45, neutral: 89 },
  { date: '01-16', positive: 234, negative: 67, neutral: 156 },
  { date: '01-17', positive: 189, negative: 89, neutral: 234 },
  { date: '01-18', positive: 312, negative: 56, neutral: 178 },
  { date: '01-19', positive: 267, negative: 78, neutral: 201 },
  { date: '01-20', positive: 389, negative: 91, neutral: 234 },
  { date: '01-21', positive: 312, negative: 67, neutral: 189 },
]

export const colorData = [
  { name: 'Color 1', value: 100, fill: 'var(--chart-1)' },
  { name: 'Color 2', value: 100, fill: 'var(--chart-2)' },
  { name: 'Color 3', value: 100, fill: 'var(--chart-3)' },
  { name: 'Color 4', value: 100, fill: 'var(--chart-4)' },
  { name: 'Color 5', value: 100, fill: 'var(--chart-5)' },
  { name: 'Color 6', value: 100, fill: 'var(--chart-6)' },
  { name: 'Color 7', value: 100, fill: 'var(--chart-7)' },
  { name: 'Color 8', value: 100, fill: 'var(--chart-8)' },
  { name: 'Color 9', value: 100, fill: 'var(--chart-9)' },
  { name: 'Color 10', value: 100, fill: 'var(--chart-10)' },
]
