import * as React from "react"

import { cn } from "@sker/ui/lib/utils"

export interface FilterOption<T = string> {
  value: T
  label: string
}

export interface FilterBarProps<T = string> {
  label?: string
  options: FilterOption<T>[]
  value?: T
  onChange: (value: T | undefined) => void
  showAll?: boolean
  className?: string
}

function FilterBar<T extends string>({
  label = "状态：",
  options,
  value,
  onChange,
  showAll = true,
  className,
}: FilterBarProps<T>) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">
        {label}
      </span>

      {showAll && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === undefined
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          全部
        </button>
      )}

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export { FilterBar }
