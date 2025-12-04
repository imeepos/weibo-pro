import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"

export interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground/70">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>

      {title && (
        <h3 className="text-sm font-medium text-foreground mb-1">
          {title}
        </h3>
      )}

      {description && (
        <p className="text-sm text-muted-foreground/70">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}

export { EmptyState }
