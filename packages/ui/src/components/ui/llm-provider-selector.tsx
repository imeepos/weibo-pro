"use client"

import * as React from "react"
import { CheckIcon, ServerIcon, ActivityIcon } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"
import { SearchInput } from "./search-input"

export interface LlmProviderItem {
  id: string
  name: string
  base_url: string
  score: number
}

export interface LlmProviderSelectorProps {
  providers: LlmProviderItem[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

function LlmProviderSelector({
  providers,
  value,
  onChange,
  placeholder = "搜索提供商...",
  className,
}: LlmProviderSelectorProps) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!search.trim()) return providers
    const keyword = search.toLowerCase()
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.base_url.toLowerCase().includes(keyword)
    )
  }, [providers, search])

  const handleSelect = (id: string) => {
    onChange?.(value === id ? "" : id)
  }

  const getScoreColor = (score: number) => {
    if (score >= 8000) return "text-green-500"
    if (score >= 5000) return "text-yellow-500"
    return "text-red-500"
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
            无匹配提供商
          </div>
        ) : (
          filtered.map((provider) => {
            const selected = value === provider.id
            return (
              <div
                key={provider.id}
                onClick={() => handleSelect(provider.id)}
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
                <ServerIcon className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{provider.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {provider.base_url}
                  </div>
                </div>
                <div className={cn("flex items-center gap-1 text-xs", getScoreColor(provider.score))}>
                  <ActivityIcon className="size-3" />
                  {provider.score}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export { LlmProviderSelector }
