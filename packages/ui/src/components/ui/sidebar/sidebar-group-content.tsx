"use client"

import * as React from "react"

import { cn } from "@sker/ui/lib/utils"

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

export { SidebarGroupContent }
