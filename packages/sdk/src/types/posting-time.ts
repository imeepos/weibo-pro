/**
 * 发帖时间热力图数据
 */
export interface PostingTimeHeatmap {
  hourlyDistribution: number[]   // 24小时分布 [0-23]
  weekdayDistribution: number[]  // 7天分布 [0-6, 0=周日]
  heatmapMatrix: number[][]      // 7x24 热力矩阵（归一化 0-1）
  peakTime: {
    hour: number
    weekday: number
    count: number
    label: string
  }
  offPeakTime: {
    hour: number
    weekday: number
    count: number
    label: string
  }
  totalPosts: number
  insights: string[]
}
