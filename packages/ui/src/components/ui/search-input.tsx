import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"

/**
 * SearchInput - 带搜索图标的输入框
 *
 * 存在即合理: 提供一致的搜索输入体验
 * 优雅即简约: 组合 Input 样式与 Search 图标，无冗余
 */
function SearchInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div className="relative w-full">
      <Search
        className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        strokeWidth={2}
      />
      <input
        type="text"
        data-slot="search-input"
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 h-9 w-full rounded-md border bg-transparent py-2 pr-3 pl-10 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { SearchInput }
