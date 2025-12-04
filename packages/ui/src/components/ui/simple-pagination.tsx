import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Button } from "./button"

export interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  showInfo?: boolean
}

function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showInfo = true,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn(
      "flex items-center justify-between",
      className
    )}>
      {showInfo && (
        <p className="text-sm text-muted-foreground/70">
          第 {currentPage} 页，共 {totalPages} 页
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
          上一页
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="gap-1"
        >
          下一页
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Button>
      </div>
    </div>
  )
}

export { SimplePagination }
