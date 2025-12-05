"use client"

import * as React from "react"
import { Check, Image, Video, Music, FileText, Search, X, Grid, List } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { ScrollArea } from "./scroll-area"
import { Badge } from "./badge"

// ============ Types ============

export type MediaType = "image" | "video" | "audio" | "text"

export interface MediaItem {
  id: string
  type: MediaType
  name: string
  url: string
  thumbnail?: string
  tags?: string[]
}

export interface MediaPickerProps {
  items: MediaItem[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  multiple?: boolean
  types?: MediaType[]
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

// ============ Constants ============

const TYPE_CONFIG: Record<MediaType, { icon: React.ElementType; label: string }> = {
  image: { icon: Image, label: "图片" },
  video: { icon: Video, label: "视频" },
  audio: { icon: Music, label: "音频" },
  text: { icon: FileText, label: "文字" },
}

// ============ Components ============

function MediaPicker({
  items,
  value,
  onValueChange,
  multiple = false,
  types = ["image", "video", "audio", "text"],
  searchPlaceholder = "搜索素材...",
  emptyText = "暂无素材",
  className,
}: MediaPickerProps) {
  const [search, setSearch] = React.useState("")
  const [activeType, setActiveType] = React.useState<MediaType | "all">("all")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")

  const selectedIds = React.useMemo(() => {
    if (!value) return new Set<string>()
    return new Set(Array.isArray(value) ? value : [value])
  }, [value])

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchType = activeType === "all" || item.type === activeType
      const matchSearch = !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      return matchType && matchSearch
    })
  }, [items, activeType, search])

  const handleSelect = (id: string) => {
    if (multiple) {
      const newSet = new Set(selectedIds)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      onValueChange?.(Array.from(newSet))
    } else {
      onValueChange?.(selectedIds.has(id) ? "" : id)
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} data-slot="media-picker">
      {/* Header: Search + View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
              onClick={() => setSearch("")}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            className="rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            className="rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={activeType === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setActiveType("all")}
        >
          全部
        </Badge>
        {types.map((type) => {
          const config = TYPE_CONFIG[type]
          const Icon = config.icon
          return (
            <Badge
              key={type}
              variant={activeType === type ? "default" : "outline"}
              className="cursor-pointer gap-1"
              onClick={() => setActiveType(type)}
            >
              <Icon className="size-3" />
              {config.label}
            </Badge>
          )
        })}
      </div>

      {/* Content */}
      <ScrollArea className="h-[320px]">
        {filteredItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-4 gap-2">
            {filteredItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={() => handleSelect(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredItems.map((item) => (
              <MediaListItem
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={() => handleSelect(item.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selection Count */}
      {multiple && selectedIds.size > 0 && (
        <div className="text-sm text-muted-foreground">
          已选择 {selectedIds.size} 项
        </div>
      )}
    </div>
  )
}

// ============ Sub Components ============

interface MediaCardProps {
  item: MediaItem
  selected: boolean
  onSelect: () => void
}

function MediaCard({ item, selected, onSelect }: MediaCardProps) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border bg-muted/30 p-2 transition-colors hover:bg-accent",
        selected && "border-primary bg-accent"
      )}
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.name}
          className="size-full rounded object-cover"
        />
      ) : (
        <Icon className="size-8 text-muted-foreground" />
      )}
      <span className="absolute bottom-1 left-1 right-1 truncate text-xs">
        {item.name}
      </span>
      {selected && (
        <div className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary">
          <Check className="size-3 text-primary-foreground" />
        </div>
      )}
    </button>
  )
}

function MediaListItem({ item, selected, onSelect }: MediaCardProps) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
        selected && "bg-accent"
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="size-full rounded object-cover"
          />
        ) : (
          <Icon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground">{config.label}</div>
      </div>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  )
}

export { MediaPicker }
