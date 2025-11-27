"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { motion } from "framer-motion"
import { cn } from "@sker/ui/lib/utils"

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

function WordCloud({
  data,
  height,
  className,
  shape = "pentagon",
  sizeRange = [12, 60],
  rotationRange = [-45, 45],
  animated = true,
  tooltipFormatter,
  onWordClick,
}: WordCloudProps) {
  const option = React.useMemo(() => {
    const processedData = data.map((item) => ({
      name: item.name,
      value: item.value,
      textStyle: item.color ? { color: item.color } : undefined,
    }))

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        textStyle: { color: "#ffffff" },
        formatter: (params: any) => {
          const item = data.find((d) => d.name === params.name)
          if (tooltipFormatter && item) {
            return tooltipFormatter(item)
          }
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div>权重: <span style="font-weight: bold;">${params.value}</span></div>
          `
        },
      },
      series: [
        {
          type: "wordCloud",
          gridSize: 8,
          sizeRange,
          rotationRange,
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
            focus: "self",
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
      animationEasing: "cubicOut",
    }
  }, [data, shape, sizeRange, rotationRange, tooltipFormatter])

  const handleEvents = React.useMemo(() => {
    if (!onWordClick) return {}
    return {
      click: (params: any) => {
        const item = data.find((d) => d.name === params.name)
        if (item) onWordClick(item)
      },
    }
  }, [data, onWordClick])

  const content = (
    <ReactECharts
      option={option}
      style={{
        height: height ? `${height}px` : "100%",
        width: "100%",
      }}
      opts={{ renderer: "canvas" }}
      notMerge={true}
      lazyUpdate={true}
      onEvents={handleEvents}
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
