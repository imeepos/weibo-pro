'use client'

import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { motion } from 'framer-motion'
import { cn } from '@sker/ui/lib/utils'

export interface EChartNativeProps {
  /** ECharts 配置选项 */
  option: EChartsOption
  /** 容器高度 */
  height?: number | string
  /** 容器宽度 */
  width?: number | string
  /** 自定义类名 */
  className?: string
  /** 渲染器类型 */
  renderer?: 'canvas' | 'svg'
  /** 是否启用入场动画 */
  animated?: boolean
  /** 图表实例就绪回调 */
  onChartReady?: (instance: echarts.ECharts) => void
}

/**
 * 原生 ECharts 组件（不依赖 echarts-for-react）
 *
 * 直接使用 echarts API，完全控制实例和地图注册
 */
export const EChartNative = React.forwardRef<HTMLDivElement, EChartNativeProps>(
  (
    {
      option,
      height = '100%',
      width = '100%',
      className,
      renderer = 'canvas',
      animated = true,
      onChartReady,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartInstanceRef = useRef<echarts.ECharts | null>(null)
    const onChartReadyRef = useRef(onChartReady)
    const [mounted, setMounted] = React.useState(false)
    const [chartReady, setChartReady] = React.useState(false)

    // 更新 onChartReady ref
    useEffect(() => {
      onChartReadyRef.current = onChartReady
    }, [onChartReady])

    // 初始化图表实例（仅在 mounted 和 renderer 变化时）
    useEffect(() => {
      if (!containerRef.current || !mounted) return

      // 创建实例
      const chart = echarts.init(containerRef.current, undefined, { renderer })
      chartInstanceRef.current = chart

      // 调用就绪回调
      if (onChartReadyRef.current) {
        onChartReadyRef.current(chart)
      }

      // 监听窗口大小变化
      const handleResize = () => {
        chart.resize()
      }
      window.addEventListener('resize', handleResize)

      // 标记 chart 已准备好
      setChartReady(true)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.dispose()
        chartInstanceRef.current = null
        setChartReady(false)
        // 重置标志，下次需要重新初始化
        isFirstSetOptionRef.current = true
      }
    }, [mounted, renderer])

    // 设置 option
    const isFirstSetOptionRef = useRef(true)

    useEffect(() => {
      // 必须等待 chart 实例准备好
      if (!chartReady) {
        return
      }

      const chart = chartInstanceRef.current
      if (!chart) {
        return
      }

      if (Object.keys(option).length === 0) {
        return
      }


      try {
        // 首次使用 notMerge，后续合并以避免词云完全重新布局
        chart.setOption(option, {
          notMerge: isFirstSetOptionRef.current,
          lazyUpdate: false,  // 词云需要立即更新
          silent: false       // 允许触发事件
        })

        isFirstSetOptionRef.current = false
      } catch (error) {
        console.error('[EChartNative] setOption 失败:', error)
      }
    }, [option, chartReady])

    // 挂载标记
    useEffect(() => {
      setMounted(true)
    }, [])

    const containerStyle: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    }

    const Container = animated ? motion.div : 'div'
    const containerProps = animated
      ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
      }
      : {}

    if (!mounted) return null

    return (
      <Container
        className={cn('echart-native-container', className)}
        {...(containerProps as any)}
      >
        <div
          ref={(node) => {
            // 支持 forwardRef
            if (ref) {
              if (typeof ref === 'function') {
                ref(node)
              } else {
                ref.current = node
              }
            }
            // 内部 ref
            if (node) {
              (containerRef as any).current = node
            }
          }}
          style={containerStyle}
        />
      </Container>
    )
  }
)

EChartNative.displayName = 'EChartNative'

