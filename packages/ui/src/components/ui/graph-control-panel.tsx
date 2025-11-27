"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@sker/ui/lib/utils"
import { Button } from "./button"
import { Settings } from "lucide-react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer"

const graphControlPanelVariants = cva(
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
      position: "top-right",
    },
  }
)

interface GraphControlPanelProps
  extends VariantProps<typeof graphControlPanelVariants> {
  title?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerIcon?: React.ReactNode
  triggerTitle?: string
  className?: string
  children?: React.ReactNode
}

function GraphControlPanel({
  title = "控制面板",
  open: controlledOpen,
  onOpenChange,
  triggerIcon,
  triggerTitle = "设置",
  position,
  className,
  children,
}: GraphControlPanelProps) {
  return (
    <Drawer direction="right" open={controlledOpen} onOpenChange={onOpenChange}>
      <div className={cn(graphControlPanelVariants({ position }), className)}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            title={triggerTitle}
            className="bg-background/90 backdrop-blur-sm border shadow-lg hover:bg-background"
          >
            {triggerIcon || <Settings className="size-4" />}
          </Button>
        </DrawerTrigger>
      </div>

      <DrawerContent className="max-w-md h-full flex flex-col">
        <DrawerHeader className="border-b shrink-0">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// 控制组子组件
interface ControlGroupProps {
  title?: string
  onReset?: () => void
  children: React.ReactNode
}

function ControlGroup({ title, onReset, children }: ControlGroupProps) {
  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          {onReset && (
            <Button
              variant="link"
              size="sm"
              onClick={onReset}
              className="h-auto p-0 text-xs"
            >
              重置
            </Button>
          )}
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

// 滑块控制项
interface SliderControlProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onValueChange: (value: number) => void
}

function SliderControl({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
  onValueChange,
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  )
}

// 开关控制项
interface SwitchControlProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SwitchControl({
  label,
  checked,
  onCheckedChange,
}: SwitchControlProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="peer w-11 h-6 bg-input rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/50 peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  )
}

export {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
  graphControlPanelVariants,
}
