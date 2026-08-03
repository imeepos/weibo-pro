"use client"

import * as React from "react"

import { cn } from "@sker/ui/lib/utils"
import { Input } from "../input.js"

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  )
}

export { SidebarInput }
