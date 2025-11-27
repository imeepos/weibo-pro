import { useMemo } from 'react'

export interface EChartThemeColors {
  /** 主文本颜色 */
  text: string
  /** 次要文本颜色 */
  textMuted: string
  /** 边框/轴线颜色 */
  border: string
  /** 分割线颜色 */
  splitLine: string
  /** Tooltip 背景色 */
  tooltipBg: string
  /** Tooltip 边框色 */
  tooltipBorder: string
  /** 工具栏图标颜色 */
  toolbox: string
  /** 高亮颜色 */
  emphasis: string
  /** 图表背景色 */
  chartBg: string
}

export interface UseEChartThemeReturn {
  isDark: boolean
  colors: EChartThemeColors
}

export interface UseEChartThemeOptions {
  /** 是否为暗色模式 */
  isDark?: boolean
  /** 自定义颜色配置 */
  customColors?: Partial<EChartThemeColors>
}

/**
 * ECharts 主题 hook
 *
 * 提供符合设计系统的主题配色方案
 *
 * @example
 * // 自动检测主题(需要 next-themes)
 * const { colors } = useEChartTheme()
 *
 * @example
 * // 手动指定主题
 * const { colors } = useEChartTheme({ isDark: true })
 *
 * @example
 * // 自定义颜色
 * const { colors } = useEChartTheme({
 *   customColors: { text: '#custom-color' }
 * })
 */
export function useEChartTheme(options?: UseEChartThemeOptions): UseEChartThemeReturn {
  // 如果没有传入 isDark,尝试从 next-themes 获取
  let isDark = options?.isDark
  if (isDark === undefined) {
    try {
      // 动态导入 next-themes,如果不存在则回退到默认值
      const { useTheme } = require('next-themes')
      const { resolvedTheme } = useTheme()
      isDark = resolvedTheme === 'dark'
    } catch {
      // 如果 next-themes 不存在,检查 document 的 class
      if (typeof document !== 'undefined') {
        isDark = document.documentElement.classList.contains('dark')
      } else {
        isDark = false
      }
    }
  }

  const colors = useMemo<EChartThemeColors>(() => {
    const defaultColors = isDark
      ? {
          text: '#ffffff',
          textMuted: '#9ca3af',
          border: 'rgba(255, 255, 255, 0.3)',
          splitLine: 'rgba(255, 255, 255, 0.1)',
          tooltipBg: 'rgba(0, 0, 0, 0.8)',
          tooltipBorder: 'rgba(255, 255, 255, 0.2)',
          toolbox: '#ffffff',
          emphasis: '#3b82f6',
          chartBg: '#1e293b',
        }
      : {
          text: '#111827',
          textMuted: '#6b7280',
          border: 'rgba(0, 0, 0, 0.3)',
          splitLine: 'rgba(0, 0, 0, 0.1)',
          tooltipBg: 'rgba(255, 255, 255, 0.95)',
          tooltipBorder: 'rgba(0, 0, 0, 0.1)',
          toolbox: '#111827',
          emphasis: '#3b82f6',
          chartBg: '#ffffff',
        }

    return {
      ...defaultColors,
      ...options?.customColors,
    }
  }, [isDark, options?.customColors])

  return { isDark: isDark || false, colors }
}
