"use client"

import * as React from "react"
import * as echarts from "echarts"
import type { EChartsOption } from "echarts"
import { motion } from "framer-motion"
import { cn } from "@sker/ui/lib/utils"
import { EChartNative } from "./echart-native"

import "echarts-wordcloud"

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

// 常量默认值，避免每次渲染创建新数组
const DEFAULT_SIZE_RANGE: [number, number] = [12, 60]
const DEFAULT_ROTATION_RANGE: [number, number] = [-45, 45]

function WordCloud({
  data,
  height,
  className,
  shape = "pentagon",
  sizeRange = DEFAULT_SIZE_RANGE,
  rotationRange = DEFAULT_ROTATION_RANGE,
  animated = true,
  tooltipFormatter,
  onWordClick,
}: WordCloudProps) {
  const dataRef = React.useRef(data)
  const tooltipFormatterRef = React.useRef(tooltipFormatter)

  // 更新 refs
  React.useEffect(() => {
    dataRef.current = data
    tooltipFormatterRef.current = tooltipFormatter
  }, [data, tooltipFormatter])

  // 使用深度比较稳定所有数组引用
  const dataKey = React.useMemo(() => {
    return JSON.stringify(data.map(item => [item.name, item.value, item.color]))
  }, [data])

  const sizeRangeKey = React.useMemo(() => JSON.stringify(sizeRange), [sizeRange])
  const rotationRangeKey = React.useMemo(() => JSON.stringify(rotationRange), [rotationRange])

  const option = React.useMemo(() => {
    const currentData = dataRef.current
    const processedData = currentData.map((item) => ({
      name: item.name,
      value: item.value,
      textStyle: item.color ? { color: item.color } : undefined,
    }))

    return {
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
          gridSize: 8,
          sizeRange: JSON.parse(sizeRangeKey),
          rotationRange: JSON.parse(rotationRangeKey),
          rotationStep: 15,
          shape,
          width: "100%",
          height: "100%",
          left: "0",
          top: "0",
          drawOutOfBound: false,
          layoutAnimation: true,
          textStyle: {
            fontFamily: "Inter, sans-serif",
            fontWeight: "bold",
            color: "#6b7280",
            emphasis: {
              shadowBlur: 10,
              shadowColor: "#333",
            },
          },
          emphasis: {
            focus: "self" as const,
            textStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
          data: processedData,
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicOut" as const,
    } as any as EChartsOption
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, shape, sizeRangeKey, rotationRangeKey])

  const onWordClickRef = React.useRef(onWordClick)

  React.useEffect(() => {
    onWordClickRef.current = onWordClick
  }, [onWordClick])

  const handleChartReady = React.useCallback(
    (chart: echarts.ECharts) => {
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

  const content = (
    <EChartNative
      option={option}
      height={height ? `${height}px` : "100%"}
      width="100%"
      renderer="canvas"
      animated={false}
      onChartReady={handleChartReady}
      className="w-full h-full"
    />
  )

  if (!animated) {
    return <div className={cn("w-full h-full", className)}>{content}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full h-full", className)}
    >
      {content}
    </motion.div>
  )
}

export { WordCloud }
