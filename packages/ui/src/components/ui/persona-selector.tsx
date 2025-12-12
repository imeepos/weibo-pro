"use client"

import * as React from "react"
import { CheckIcon, UserIcon, BrainCircuitIcon } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"
import { SearchInput } from "./search-input"

export interface PersonaItem {
  id: string
  name: string
  avatar?: string | null
  description?: string | null
  memoryCount: number
}

export interface PersonaSelectorProps {
  personas: PersonaItem[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  defaultLimit?: number
}

function PersonaSelector({
  personas,
  value,
  onChange,
  placeholder = "搜索角色...",
  className,
  defaultLimit = 3,
}: PersonaSelectorProps) {
  const [search, setSearch] = React.useState("")
  const [expanded, setExpanded] = React.useState(false)

  const filtered = React.useMemo(() => {
    if (!search.trim()) return personas
    const keyword = search.toLowerCase()
    return personas.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword)
    )
  }, [personas, search])

  // 搜索时显示全部，否则受限于 defaultLimit
  const isSearching = search.trim().length > 0
  const displayList = isSearching || expanded ? filtered : filtered.slice(0, defaultLimit)
  const hasMore = !isSearching && filtered.length > defaultLimit

  const handleSelect = (id: string) => {
    onChange?.(value === id ? "" : id)
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <SearchInput
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="border-border max-h-60 overflow-y-auto rounded-md border">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            无匹配角色
          </div>
        ) : (
          <>
            {displayList.map((persona) => {
              const selected = value === persona.id
              return (
                <div
                  key={persona.id}
                  onClick={() => handleSelect(persona.id)}
                  className={cn(
                    "border-border flex cursor-pointer items-center gap-3 border-b p-3 transition-colors last:border-b-0",
                    selected ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {selected && <CheckIcon className="size-3" />}
                  </div>
                  {persona.avatar ? (
                    <img
                      src={persona.avatar}
                      alt={persona.name}
                      className="size-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                      <UserIcon className="text-muted-foreground size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate font-medium">{persona.name}</div>
                    {persona.description && (
                      <div className="text-muted-foreground truncate text-xs">
                        {persona.description}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <BrainCircuitIcon className="size-3" />
                    {persona.memoryCount}
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground hover:text-foreground w-full py-2 text-center text-xs transition-colors"
              >
                {expanded ? "收起" : `展开更多 (${filtered.length - defaultLimit})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export { PersonaSelector }
