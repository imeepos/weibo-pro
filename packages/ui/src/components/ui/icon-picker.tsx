"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check, Search, X } from "lucide-react"
import * as LucideIcons from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { ScrollArea } from "./scroll-area"

interface IconPickerProps {
  value?: string
  onValueChange?: (value: string) => void
  icons?: string[]
  searchPlaceholder?: string
  emptyText?: string
  triggerClassName?: string
  children?: React.ReactNode
}

function IconPicker({
  value,
  onValueChange,
  icons: customIcons,
  searchPlaceholder = "搜索图标...",
  emptyText = "未找到图标",
  triggerClassName,
  children,
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const availableIcons = React.useMemo(() => {
    if (customIcons) return customIcons

    return Object.keys(LucideIcons).filter(
      (key) =>
        typeof LucideIcons[key as keyof typeof LucideIcons] === "function" &&
        key !== "createLucideIcon" &&
        !key.startsWith("Lucide")
    )
  }, [customIcons])

  const filteredIcons = React.useMemo(() => {
    if (!search) return availableIcons
    return availableIcons.filter((icon) =>
      icon.toLowerCase().includes(search.toLowerCase())
    )
  }, [availableIcons, search])

  const IconComponent = value
    ? (LucideIcons[
        value as keyof typeof LucideIcons
      ] as React.ComponentType<{ className?: string }>)
    : null

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        {children ?? (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", triggerClassName)}
          >
            {value ? (
              <span className="flex items-center gap-2">
                {IconComponent && <IconComponent className="size-4" />}
                <span className="truncate">{value}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">选择图标</span>
            )}
          </Button>
        )}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 origin-(--radix-popover-content-transform-origin) rounded-md border shadow-md outline-hidden",
            "w-[320px] p-0"
          )}
          align="start"
          sideOffset={4}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="size-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() => setSearch("")}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
          <ScrollArea className="h-[280px]">
            {filteredIcons.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2 p-3">
                {filteredIcons.map((iconName) => {
                  const Icon = LucideIcons[
                    iconName as keyof typeof LucideIcons
                  ] as React.ComponentType<{ className?: string }>
                  const isSelected = value === iconName

                  if (!Icon) return null

                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        onValueChange?.(iconName)
                        setOpen(false)
                        setSearch("")
                      }}
                      className={cn(
                        "relative flex size-12 items-center justify-center rounded-md border transition-colors hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                      title={iconName}
                    >
                      <Icon className="size-5" />
                      {isSelected && (
                        <Check className="absolute right-0.5 top-0.5 size-3 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { IconPicker }
