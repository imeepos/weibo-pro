'use client'

import React from 'react'
import { Clock, Plus, X, ArrowUpDown } from 'lucide-react'
import { Button } from '@sker/ui/components/ui/button'
import { SearchInput } from '@sker/ui/components/ui/search-input'
import type { SortField } from './schedule-list-types'

/**
 * 调度列表头部
 *
 * 职责:标题、新建/关闭按钮、搜索框与排序切换。
 */
export interface ScheduleListHeaderProps {
  count: number
  searchQuery: string
  onSearchChange: (value: string) => void
  sortField: SortField
  onSort: (field: SortField) => void
  onCreate: () => void
  onClose?: () => void
}

export function ScheduleListHeader({
  count,
  searchQuery,
  onSearchChange,
  sortField,
  onSort,
  onCreate,
  onClose,
}: ScheduleListHeaderProps) {
  return (
    <div className="border-border border-b px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-secondary text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Clock className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">调度管理</h3>
            <p className="text-muted-foreground text-sm">{count} 个调度</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            新建
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" strokeWidth={1.8} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            placeholder="搜索调度..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={sortField === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSort('name')}
          >
            名称
            {sortField === 'name' && (
              <ArrowUpDown className="ml-1 h-3 w-3" strokeWidth={2} />
            )}
          </Button>
          <Button
            variant={sortField === 'nextRunAt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSort('nextRunAt')}
          >
            时间
            {sortField === 'nextRunAt' && (
              <ArrowUpDown className="ml-1 h-3 w-3" strokeWidth={2} />
            )}
          </Button>
          <Button
            variant={sortField === 'status' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSort('status')}
          >
            状态
            {sortField === 'status' && (
              <ArrowUpDown className="ml-1 h-3 w-3" strokeWidth={2} />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
