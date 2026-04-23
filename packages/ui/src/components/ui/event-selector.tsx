"use client"

import * as React from "react"
import { CheckIcon, CalendarIcon, TrendingUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"
import { SearchInput } from "./search-input"
import { Button } from "./button"
import { useDebounceFn } from "@sker/ui/hooks/use-debounce-fn"

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
  onSearch?: (keyword: string, page?: number) => EventItem[] | Promise<EventItem[]>
  pageSize?: number
  onPageChange?: (page: number) => void
  debounceMs?: number
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
  onSearch,
  pageSize,
  onPageChange,
  debounceMs = 0,
}: EventSelectorProps) {
  const [search, setSearch] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<EventItem[] | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)

  const performSearch = React.useCallback(async (keyword: string, page: number) => {
    if (!onSearch) return
    if (!keyword.trim()) {
      setSearchResults(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const results = await onSearch(keyword, page)
      setSearchResults(Array.isArray(results) ? results : [])
    } finally {
      setIsLoading(false)
    }
  }, [onSearch])

  const { run: debouncedSearch } = useDebounceFn(
    (keyword: string, page: number) => performSearch(keyword, page),
    debounceMs > 0 ? debounceMs : undefined
  )

  const handleSearchChange = (keyword: string) => {
    setSearch(keyword)
    const page = 1
    setCurrentPage(page)
    if (onSearch) {
      if (debounceMs > 0) {
        debouncedSearch(keyword, page)
      } else {
        performSearch(keyword, page)
      }
    }
  }

  const selectedSet = React.useMemo(() => {
    if (!value) return new Set<string>()
    return new Set(Array.isArray(value) ? value : [value])
  }, [value])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return events
    if (onSearch && searchResults !== null) return searchResults
    const keyword = search.toLowerCase()
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(keyword) ||
        e.description?.toLowerCase().includes(keyword) ||
        e.category?.name.toLowerCase().includes(keyword)
    )
  }, [events, search, onSearch, searchResults])

  const totalPages = pageSize ? Math.ceil(filtered.length / pageSize) : 1
  const paginatedEvents = pageSize
    ? filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filtered

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    onPageChange?.(page)
    if (onSearch && search.trim()) {
      if (debounceMs > 0) {
        debouncedSearch(search, page)
      } else {
        performSearch(search, page)
      }
    }
  }

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
        onChange={(e) => handleSearchChange(e.target.value)}
      />
      <div className="border-border max-h-80 overflow-y-auto rounded-md border">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            无匹配事件
          </div>
        ) : (
          paginatedEvents.map((event) => {
            const selected = selectedSet.has(event.id)
            return (
              <div
                key={event.id}
                data-slot="event-item"
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(event.id)
                }}
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
                    <span className="truncate font-medium text-foreground">{event.title}</span>
                    {event.category && (
                      <span className="bg-secondary text-secondary-foreground shrink-0 rounded px-1.5 py-0.5 text-xs border border-border">
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
      {pageSize && filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            第 {currentPage} 页 / 共 {totalPages} 页
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeftIcon className="size-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              下一页
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { EventSelector }
