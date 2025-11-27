'use client'

import React from 'react'
import ReactECharts, { type EChartsOption } from 'echarts-for-react'
import { motion } from 'framer-motion'
import { cn } from '@sker/ui/lib/utils'

export interface EChartProps {
  /** ECharts 配置选项 */
  option: EChartsOption
  /** 容器高度(px) */
  height?: number
  /** 容器宽度(px 或 百分比字符串) */
  width?: number | string
  /** 自定义类名 */
  className?: string
  /** 是否显示加载动画 */
  loading?: boolean
  /** 渲染器类型 */
  renderer?: 'canvas' | 'svg'
  /** 是否启用入场动画 */
  animated?: boolean
  /** 动画配置 */
  animation?: {
    initial?: { opacity?: number; y?: number }
    animate?: { opacity?: number; y?: number }
    duration?: number
  }
  /** ReactECharts 其他属性 */
  opts?: {
    renderer?: 'canvas' | 'svg'
    devicePixelRatio?: number
    useDirtyRect?: boolean
    useCoarsePointer?: boolean
    pointerSize?: number
    ssr?: boolean
    width?: number | string
    height?: number | string
    locale?: string
  }
  /** 是否不合并配置 */
  notMerge?: boolean
  /** 是否延迟更新 */
  lazyUpdate?: boolean
}

/**
 * EChart 通用容器组件
 *
 * 封装 ReactECharts,提供主题、动画、加载状态等通用能力
 */
export const EChart = React.forwardRef<ReactECharts, EChartProps>(
  (
    {
      option,
      height,
      width = '100%',
      className,
      loading = false,
      renderer = 'canvas',
      animated = true,
      animation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        duration: 0.5,
      },
      opts,
      notMerge = true,
      lazyUpdate = true,
      ...props
    },
    ref,
  ) => {
    const heightValue = height ? `${height}px` : '100%'
    const widthValue = typeof width === 'number' ? `${width}px` : width

    const Container = animated ? motion.div : 'div'

    const containerProps = animated
      ? {
          initial: animation.initial,
          animate: animation.animate,
          transition: { duration: animation.duration },
        }
      : {}

    return (
      <Container
        className={cn('echart-container', className)}
        {...(containerProps as any)}
      >
        <ReactECharts
          ref={ref}
          option={option}
          style={{ height: heightValue, width: widthValue }}
          opts={{ renderer, ...opts }}
          notMerge={notMerge}
          lazyUpdate={lazyUpdate}
          showLoading={loading}
          {...props}
        />
      </Container>
    )
  },
)

EChart.displayName = 'EChart'

export default EChart
