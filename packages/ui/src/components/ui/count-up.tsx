import * as React from "react"
import { cn } from "@sker/ui/lib/utils"

interface CountUpProps extends Omit<React.ComponentProps<"span">, "prefix"> {
  end: number
  start?: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  animated?: boolean
  onComplete?: () => void
}

const CountUp = React.forwardRef<HTMLSpanElement, CountUpProps>(
  (
    {
      end,
      start = 0,
      duration = 1000,
      prefix = "",
      suffix = "",
      decimals = 0,
      animated = true,
      onComplete,
      className,
      ...props
    },
    ref
  ) => {
    const [count, setCount] = React.useState(start)
    const animationRef = React.useRef<number>()
    const startTimeRef = React.useRef<number>()

    const formatValue = (value: number) => {
      const formatted =
        decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toString()
      return `${prefix}${formatted}${suffix}`
    }

    const animate = React.useCallback(
      (currentTime: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = currentTime
        }

        const elapsed = currentTime - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentValue = start + (end - start) * easeOutQuart

        setCount(currentValue)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          onComplete?.()
        }
      },
      [duration, end, start, onComplete]
    )

    React.useEffect(() => {
      if (!animated) {
        setCount(end)
        return
      }

      startTimeRef.current = undefined

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }, [end, start, animated, animate])

    return (
      <span
        ref={ref}
        data-slot="count-up"
        className={cn("font-mono tabular-nums", className)}
        {...props}
      >
        {formatValue(count)}
      </span>
    )
  }
)
CountUp.displayName = "CountUp"

export { CountUp }
