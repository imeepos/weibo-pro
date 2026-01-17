"use client"

import * as React from "react"
import * as echarts from "echarts"
import type { EChartsOption } from "echarts"
import { cn } from "@sker/ui/lib/utils"
import { EChartNative } from "./echart-native"

import "echarts-wordcloud"

// 主题检测 hook
function useDarkMode() {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    const checkDark = () => root.classList.contains('dark')
    setIsDark(checkDark())

    const observer = new MutationObserver(() => {
      setIsDark(checkDark())
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return isDark
}

export interface WordCloudItem {
  name: string
  value: number
  color?: string
}

export interface WordCloudProps {
  data: WordCloudItem[]
  height?: number
  className?: string
  shape?: "circle" | "pentagon" | "diamond" | "square" | "star"
  sizeRange?: [number, number]
  rotationRange?: [number, number]
  animated?: boolean
  tooltipFormatter?: (item: WordCloudItem) => string
  onWordClick?: (item: WordCloudItem) => void
}

export interface WordCloudRef {
  exportAsPNG: (filename?: string) => void
}

// 常量默认值
const DEFAULT_SIZE_RANGE: [number, number] = [12, 40]
const DEFAULT_ROTATION_RANGE: [number, number] = [-45, 45]

// 简单哈希函数
function hashData(data: WordCloudItem[]): string {
  if (data.length === 0) return 'empty'
  let hash = 0
  for (let i = 0; i < Math.min(data.length, 50); i++) {
    const item = data[i]
    if (item) {
      hash = (((hash << 5) - hash) + item.name.length + item.value) | 0
    }
  }
  return `${data.length}-${hash}`
}

const WordCloud = React.forwardRef<WordCloudRef, WordCloudProps>(({
  data,
  height,
  className,
  shape = "pentagon",
  sizeRange = DEFAULT_SIZE_RANGE,
  rotationRange = DEFAULT_ROTATION_RANGE,
  animated = true,
  tooltipFormatter,
  onWordClick,
}, ref) => {
  const dataRef = React.useRef(data)
  const tooltipFormatterRef = React.useRef(tooltipFormatter)
  const chartRef = React.useRef<echarts.ECharts | null>(null)
  const isDark = useDarkMode()

  // 暴露导出方法
  React.useImperativeHandle(ref, () => ({
    exportAsPNG: (filename?: string) => {
      const chart = chartRef.current
      if (!chart) return
      const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff'
      })
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `词云_${new Date().toLocaleDateString()}.png`
      link.click()
    }
  }))

  // 更新 refs
  React.useEffect(() => {
    dataRef.current = data
    tooltipFormatterRef.current = tooltipFormatter
  }, [data, tooltipFormatter])

  const dataHash = React.useMemo(() => hashData(data), [data])

  const option = React.useMemo(() => {
    const currentData = dataRef.current
    const processedData = currentData.map((item) => ({
      name: item.name,
      value: item.value,
      textStyle: item.color ? { color: item.color } : undefined,
    }))

    const newOption: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: "item" as const,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: { color: "#ffffff" },
        formatter: (params: any) => {
          const item = dataRef.current.find((d) => d.name === params.name)
          if (tooltipFormatterRef.current && item) {
            return tooltipFormatterRef.current(item)
          }
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div>权重: <span style="font-weight: bold;">${params.value}</span></div>
          `
        },
      },
      series: [
        {
          type: "wordCloud" as const,
          gridSize: 4,
          sizeRange,
          rotationRange,
          rotationStep: 15,
          shape,
          width: "100%",
          height: "100%",
          left: "center",
          top: "center",
          drawOutOfBound: false,
          layoutAnimation: animated,
          textStyle: {
            fontFamily: "Inter, sans-serif",
            fontWeight: "bold",
            color: isDark ? "#9ca3af" : "#6b7280",
          },
          emphasis: {
            focus: "self" as const,
          } as any,
          data: processedData,
        },
      ],
      animation: animated,
      animationDuration: animated ? 300 : 0,
      animationEasing: "cubicOut" as const,
    }

    return newOption
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataHash, shape, sizeRange[0], sizeRange[1], rotationRange[0], rotationRange[1], animated, isDark])

  const onWordClickRef = React.useRef(onWordClick)

  React.useEffect(() => {
    onWordClickRef.current = onWordClick
  }, [onWordClick])

  const handleChartReady = React.useCallback(
    (chart: echarts.ECharts) => {
      chartRef.current = chart
      if (onWordClickRef.current) {
        chart.on("click", (params: any) => {
          const item = dataRef.current.find((d) => d.name === params.name)
          if (item && onWordClickRef.current) {
            onWordClickRef.current(item)
          }
        })
      }
    },
    []
  )

  return (
    <EChartNative
      option={option}
      height={height ? `${height}px` : "100%"}
      width="100%"
      renderer="canvas"
      animated={false}
      onChartReady={handleChartReady}
      className={cn("w-full h-full", className)}
    />
  )
})

WordCloud.displayName = 'WordCloud'

export { WordCloud }
