'use client'

import React from 'react'
import { Button } from '@sker/ui/components/ui/button'
import { ITEMS_PER_PAGE } from './schedule-list-types'

/**
 * 调度列表分页
 *
 * 职责:展示当前范围/总数,提供上页、页码、下页切换。
 */
export interface ScheduleListPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function ScheduleListPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: ScheduleListPaginationProps) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const end = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-xs">
        显示 {start}-{end} 项，共 {totalItems} 项
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          &lt;
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="icon-sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          &gt;
        </Button>
      </div>
    </div>
  )
}
