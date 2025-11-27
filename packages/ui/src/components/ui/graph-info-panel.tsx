"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@sker/ui/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "./card"
import { Button } from "./button"
import { X } from "lucide-react"
import { ScrollArea } from "./scroll-area"

const graphInfoPanelVariants = cva(
  "fixed z-10 transition-all",
  {
    variants: {
      position: {
        "top-left": "top-4 left-4",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "bottom-right": "bottom-4 right-4",
      },
    },
    defaultVariants: {
      position: "bottom-left",
    },
  }
)

interface GraphInfoPanelProps
  extends VariantProps<typeof graphInfoPanelVariants> {
  title?: string
  open?: boolean
  onClose?: () => void
  maxHeight?: string
  maxWidth?: string
  className?: string
  children?: React.ReactNode
}

function GraphInfoPanel({
  title = "信息面板",
  open = false,
  onClose,
  position,
  maxHeight = "96",
  maxWidth = "80",
  className,
  children,
}: GraphInfoPanelProps) {
  if (!open) return null

  return (
    <Card
      className={cn(
        graphInfoPanelVariants({ position }),
        `max-w-${maxWidth} max-h-${maxHeight} bg-background/95 backdrop-blur-sm border shadow-xl`,
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {onClose && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-full">
          {children}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// 信息项组件
interface InfoItemProps {
  label: string
  value: React.ReactNode
  variant?: "default" | "accent"
}

function InfoItem({ label, value, variant = "default" }: InfoItemProps) {
  const bgClass = variant === "accent"
    ? "bg-primary/10 text-primary-foreground"
    : "bg-muted"

  return (
    <div className={cn("rounded-md p-2", bgClass)}>
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}

// 信息网格组件
interface InfoGridProps {
  columns?: 1 | 2 | 3 | 4
  children: React.ReactNode
}

function InfoGrid({ columns = 2, children }: InfoGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns]

  return <div className={cn("grid gap-2", gridClass)}>{children}</div>
}

// 信息列表组件
interface InfoListProps {
  items: Array<{
    id: string | number
    color?: string
    label: string
    value: React.ReactNode
  }>
  maxItems?: number
}

function InfoList({ items, maxItems }: InfoListProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items
  const remaining = maxItems && items.length > maxItems ? items.length - maxItems : 0

  return (
    <div className="space-y-2">
      {displayItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
        >
          <div className="flex items-center gap-2">
            {item.color && (
              <div
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="font-medium">{item.label}</span>
          </div>
          <div className="text-muted-foreground">{item.value}</div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-xs text-muted-foreground text-center py-1">
          还有 {remaining} 项...
        </div>
      )}
    </div>
  )
}

export {
  GraphInfoPanel,
  InfoItem,
  InfoGrid,
  InfoList,
  graphInfoPanelVariants,
}
