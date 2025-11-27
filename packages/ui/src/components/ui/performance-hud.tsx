"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@sker/ui/lib/utils"

const performanceHudVariants = cva(
  "fixed backdrop-blur-sm bg-background/50 rounded-md p-2 text-xs font-mono shadow-sm border border-border/50 transition-all",
  {
    variants: {
      position: {
        "top-left": "top-4 left-4",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "bottom-right": "bottom-4 right-4",
      },
      level: {
        high: "border-l-4 border-l-green-500/50",
        medium: "border-l-4 border-l-yellow-500/50",
        low: "border-l-4 border-l-red-500/50",
      },
    },
    defaultVariants: {
      position: "top-left",
      level: "high",
    },
  }
)

type PerformanceLevel = "high" | "medium" | "low"

interface Metric {
  label: string
  value: string | number
  color?: string
  suffix?: string
}

interface PerformanceHudProps
  extends VariantProps<typeof performanceHudVariants> {
  visible?: boolean
  title?: string
  level?: PerformanceLevel
  metrics?: Metric[]
  className?: string
}

function PerformanceHud({
  visible = false,
  title = "性能监控",
  level = "high",
  position,
  metrics = [],
  className,
}: PerformanceHudProps) {
  if (!visible) return null

  const levelConfig = {
    high: { label: "高", className: "bg-green-500/20 text-green-400" },
    medium: { label: "中", className: "bg-yellow-500/20 text-yellow-400" },
    low: { label: "低", className: "bg-red-500/20 text-red-400" },
  }

  const currentLevel = levelConfig[level]

  return (
    <div
      className={cn(performanceHudVariants({ position, level }), className)}
    >
      <div className="font-bold mb-1 flex items-center gap-2">
        ⚡ {title}
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-sm",
            currentLevel.className
          )}
        >
          {currentLevel.label}
        </span>
      </div>
      <div className="space-y-0.5">
        {metrics.map((metric, index) => (
          <MetricLine key={index} {...metric} />
        ))}
      </div>
    </div>
  )
}

interface MetricLineProps extends Metric {}

function MetricLine({ label, value, color, suffix = "" }: MetricLineProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className={color}>
        {value}
        {suffix}
      </span>
    </div>
  )
}

// 用于计算性能等级的辅助函数
function getPerformanceLevel(fps: number): PerformanceLevel {
  if (fps >= 50) return "high"
  if (fps >= 30) return "medium"
  return "low"
}

// 用于格式化 FPS 的辅助函数
function getFpsColor(fps: number): string {
  if (fps >= 50) return "text-green-400"
  if (fps >= 30) return "text-yellow-400"
  return "text-red-400"
}

export {
  PerformanceHud,
  MetricLine,
  performanceHudVariants,
  getPerformanceLevel,
  getFpsColor,
  type PerformanceLevel,
  type Metric,
}
