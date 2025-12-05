"use client"

import * as React from "react"
import { CheckIcon, CalendarIcon, TrendingUpIcon } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"
import { SearchInput } from "./search-input"

export interface EventItem {
  id: string
  title: string
  description?: string | null
  category?: { name: string } | null
  hotness?: number
  occurred_at?: Date | string | null
  created_at?: Date | string
}

export interface EventSelectorProps {
  events: EventItem[]
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  multiple?: boolean
  placeholder?: string
  className?: string
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

function EventSelector({
  events,
  value,
  onChange,
  multiple = false,
  placeholder = "搜索事件...",
  className,
}: EventSelectorProps) {
  const [search, setSearch] = React.useState("")

  const selectedSet = React.useMemo(() => {
    if (!value) return new Set<string>()
    return new Set(Array.isArray(value) ? value : [value])
  }, [value])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return events
    const keyword = search.toLowerCase()
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(keyword) ||
        e.description?.toLowerCase().includes(keyword) ||
        e.category?.name.toLowerCase().includes(keyword)
    )
  }, [events, search])

  const handleSelect = (id: string) => {
    if (!onChange) return
    if (multiple) {
      const next = selectedSet.has(id)
        ? [...selectedSet].filter((v) => v !== id)
        : [...selectedSet, id]
      onChange(next)
    } else {
      onChange(selectedSet.has(id) ? "" : id)
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <SearchInput
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="border-border max-h-80 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            无匹配事件
          </div>
        ) : (
          filtered.map((event) => {
            const selected = selectedSet.has(event.id)
            return (
              <div
                key={event.id}
                data-slot="event-item"
                onClick={() => handleSelect(event.id)}
                className={cn(
                  "border-border flex cursor-pointer items-start gap-3 border-b p-3 transition-colors last:border-b-0",
                  selected
                    ? "bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {selected && <CheckIcon className="size-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{event.title}</span>
                    {event.category && (
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                        {event.category.name}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {event.description}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      {formatDate(event.occurred_at || event.created_at)}
                    </span>
                    {event.hotness !== undefined && (
                      <span className="flex items-center gap-1">
                        <TrendingUpIcon className="size-3" />
                        {event.hotness}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export { EventSelector }
