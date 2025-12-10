"use client"

import * as React from "react"
import { CheckIcon, CpuIcon } from "lucide-react"
import { cn } from "@sker/ui/lib/utils"
import { SearchInput } from "./search-input"

export interface LlmModelItem {
  id: string
  name: string
}

export interface LlmModelSelectorProps {
  models: LlmModelItem[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

function LlmModelSelector({
  models,
  value,
  onChange,
  placeholder = "搜索模型...",
  className,
}: LlmModelSelectorProps) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!search.trim()) return models
    const keyword = search.toLowerCase()
    return models.filter((m) => m.name.toLowerCase().includes(keyword))
  }, [models, search])

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
            无匹配模型
          </div>
        ) : (
          filtered.map((model) => {
            const selected = value === model.id
            return (
              <div
                key={model.id}
                onClick={() => handleSelect(model.id)}
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
                <CpuIcon className="text-muted-foreground size-4 shrink-0" />
                <div className="truncate font-medium">{model.name}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export { LlmModelSelector }
