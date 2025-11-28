import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@sker/ui/lib/utils"
import { Button } from "./button"

const graphFloatingButtonVariants = cva(
  "absolute bg-background/90 backdrop-blur-sm border shadow-lg hover:bg-background transition-colors",
  {
    variants: {
      position: {
        "top-left": "top-4 left-4",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-2 left-2",
        "bottom-right": "bottom-2 right-2",
      },
    },
    defaultVariants: {
      position: "bottom-right",
    },
  }
)

interface GraphFloatingButtonProps
  extends React.ComponentProps<typeof Button>,
    VariantProps<typeof graphFloatingButtonVariants> {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
}

function GraphFloatingButton({
  className,
  position,
  children,
  variant = "outline",
  size = "icon",
  ...props
}: GraphFloatingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(graphFloatingButtonVariants({ position }), className)}
      {...props}
    >
      {children}
    </Button>
  )
}

export { GraphFloatingButton, graphFloatingButtonVariants }
