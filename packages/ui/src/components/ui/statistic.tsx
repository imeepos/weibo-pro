import * as React from "react"
import { cn } from "@sker/ui/lib/utils"

const Statistic = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="statistic"
    className={cn("flex flex-col gap-2", className)}
    {...props}
  />
))
Statistic.displayName = "Statistic"

const StatisticLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="statistic-label"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
StatisticLabel.displayName = "StatisticLabel"

const StatisticValue = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="statistic-value"
    className={cn("text-3xl font-bold", className)}
    {...props}
  />
))
StatisticValue.displayName = "StatisticValue"

const StatisticDescription = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="statistic-description"
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
))
StatisticDescription.displayName = "StatisticDescription"

export { Statistic, StatisticLabel, StatisticValue, StatisticDescription }
