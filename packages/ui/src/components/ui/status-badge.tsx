import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@sker/ui/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium",
  {
    variants: {
      status: {
        success: "bg-green-500/10 text-green-400 border-green-500/20 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
        error: "bg-red-500/10 text-red-400 border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
        warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
        info: "bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
        pending: "bg-gray-500/10 text-gray-400 border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20",
        cancelled: "bg-orange-500/10 text-orange-400 border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
      },
    },
    defaultVariants: {
      status: "info",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode
}

function StatusBadge({
  className,
  status,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
