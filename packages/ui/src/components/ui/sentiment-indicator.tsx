import * as React from "react"
import { cn } from "@sker/ui/lib/utils"

type SentimentLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
type SentimentType = "positive" | "negative" | "neutral"

interface SentimentIndicatorProps extends React.ComponentProps<"div"> {
  type: SentimentType
  level: SentimentLevel
  showLabel?: boolean
}

const sentimentConfig = {
  positive: {
    color: "34, 197, 94",
    label: "正面",
  },
  negative: {
    color: "239, 68, 68",
    label: "负面",
  },
  neutral: {
    color: "107, 114, 128",
    label: "中性",
  },
} as const

const SentimentIndicator = React.forwardRef<
  HTMLDivElement,
  SentimentIndicatorProps
>(({ type, level, showLabel = false, className, ...props }, ref) => {
  const config = sentimentConfig[type]
  const alpha = level / 10
  const backgroundColor = `rgba(${config.color}, ${alpha})`
  const borderColor = `rgb(${config.color})`

  return (
    <div
      ref={ref}
      data-slot="sentiment-indicator"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <div
        className={cn(
          "h-4 w-4 rounded-full border-2 transition-all duration-300"
        )}
        style={{
          backgroundColor,
          borderColor,
          boxShadow: level > 7 ? `0 0 8px ${borderColor}` : "none",
        }}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {config.label} ({level}/10)
        </span>
      )}
    </div>
  )
})
SentimentIndicator.displayName = "SentimentIndicator"

export { SentimentIndicator }
export type { SentimentLevel, SentimentType }
