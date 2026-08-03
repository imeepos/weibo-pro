"use client"

import * as React from "react"

import { cn } from "@sker/ui/lib/utils"
import { Separator } from "../separator.js"

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  )
}

export { SidebarSeparator }
