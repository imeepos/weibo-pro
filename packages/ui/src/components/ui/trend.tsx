import * as React from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"

interface TrendProps extends React.ComponentProps<"div"> {
  value: number
  label?: string
  showIcon?: boolean
}

const Trend = React.forwardRef<HTMLDivElement, TrendProps>(
  ({ value, label, showIcon = true, className, ...props }, ref) => {
    const isPositive = value >= 0
    const Icon = isPositive ? ArrowUp : ArrowDown

    return (
      <div
        ref={ref}
        data-slot="trend"
        className={cn("flex items-center gap-1 text-sm font-medium", className)}
        {...props}
      >
        {showIcon && (
          <Icon
            className={cn(
              "h-3 w-3",
              isPositive ? "text-green-500" : "text-red-500"
            )}
          />
        )}
        <span
          className={cn(
            isPositive ? "text-green-500" : "text-red-500"
          )}
        >
          {Math.abs(value).toFixed(1)}%
        </span>
        {label && (
          <span className="text-muted-foreground">{label}</span>
        )}
      </div>
    )
  }
)
Trend.displayName = "Trend"

export { Trend }
