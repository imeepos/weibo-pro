'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { Card } from '@sker/ui/components/ui/card'
import { ScheduleCard } from '@sker/ui/components/ui/schedule-card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@sker/ui/components/ui/empty'

import { useScheduleList } from './useScheduleList'
import { ScheduleListHeader } from './ScheduleListHeader'
import { ScheduleListPagination } from './ScheduleListPagination'
import { ScheduleListDialogs } from './ScheduleListDialogs'
import { getScheduleDescription, formatDateTime } from './schedule-list-utils'
import { STATUS_CONFIG, TYPE_CONFIG } from './schedule-list-types'
import type { ScheduleListProps, ScheduleStatus, ScheduleType } from './schedule-list-types'

export type { ScheduleListProps } from './schedule-list-types'

/**
 * 调度列表
 *
 * 职责:
 * - 展示工作流的调度计划
 * - 管理调度状态(启用/禁用)
 * - 删除和编辑调度
 * - 搜索和过滤调度
 * - 分页和排序
 *
 * 结构:
 * - useScheduleList: 状态与业务逻辑
 * - ScheduleListHeader: 头部(标题/搜索/排序)
 * - ScheduleListPagination: 分页
 * - ScheduleListDialogs: 新建/编辑/触发/删除弹窗
 */
export function ScheduleList({ workflowName, className = '', onClose, apiBaseUrl }: ScheduleListProps) {
  const list = useScheduleList(workflowName, apiBaseUrl)

  if (list.loading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center p-24">
          <div className="flex flex-col items-center gap-4">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-muted-foreground text-sm">加载调度列表...</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <ScheduleListHeader
          count={list.filteredSchedules.length}
          searchQuery={list.searchQuery}
          onSearchChange={list.setSearchQuery}
          sortField={list.sortField}
          onSort={list.handleSort}
          onCreate={() => list.setShowCreateDialog(true)}
          onClose={onClose}
        />

        <div className="px-4">
          {list.error && (
            <div className="border-destructive/30 bg-destructive/10 mb-4 rounded-lg border p-4">
              <p className="text-destructive text-sm">{list.error}</p>
            </div>
          )}

          {list.paginatedSchedules.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock className="text-muted-foreground h-8 w-8" strokeWidth={1.5} />
                </EmptyMedia>
                <EmptyTitle>
                  {list.searchQuery ? '未找到匹配的调度' : '暂无调度计划'}
                </EmptyTitle>
                <EmptyDescription>
                  {list.searchQuery ? '尝试使用其他关键词搜索' : '点击"新建"按钮创建第一个调度任务'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4">
                {list.paginatedSchedules.map((schedule) => {
                  const statusConfig = STATUS_CONFIG[schedule.status as ScheduleStatus]
                  const typeConfig = TYPE_CONFIG[schedule.scheduleType as ScheduleType]

                  return (
                    <ScheduleCard
                      key={schedule.id}
                      name={schedule.name}
                      description={getScheduleDescription(schedule)}
                      status={statusConfig}
                      type={typeConfig}
                      enabled={schedule.status === 'enabled'}
                      expired={schedule.status === 'expired'}
                      nextRunAt={schedule.nextRunAt ? formatDateTime(schedule.nextRunAt) : undefined}
                      lastRunAt={schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : undefined}
                      isManual={schedule.scheduleType === 'manual'}
                      scheduleId={schedule.id}
                      apiBaseUrl={list.effectiveApiBaseUrl}
                      triggering={list.triggeringIds.has(schedule.id)}
                      onToggle={() => list.handleToggleStatus(schedule)}
                      onEdit={() => list.handleEdit(schedule)}
                      onDelete={() => list.handleDelete(schedule.id)}
                      onTrigger={() => list.handleTrigger(schedule)}
                    />
                  )
                })}
              </div>

              <ScheduleListPagination
                currentPage={list.currentPage}
                totalPages={list.totalPages}
                totalItems={list.filteredSchedules.length}
                onPageChange={list.setCurrentPage}
              />
            </>
          )}
        </div>
      </Card>

      <ScheduleListDialogs
        workflowName={workflowName}
        editSchedule={list.editSchedule}
        onEditClose={() => list.setEditSchedule(null)}
        showCreateDialog={list.showCreateDialog}
        onCreateOpenChange={list.setShowCreateDialog}
        deleteScheduleId={list.deleteScheduleId}
        onDeleteClose={() => list.setDeleteScheduleId(null)}
        onConfirmDelete={list.confirmDelete}
        triggerDialogSchedule={list.triggerDialogSchedule}
        workflowAst={list.workflowAst}
        onConfirmTrigger={list.handleConfirmTrigger}
        onCancelTrigger={list.handleCancelTrigger}
        onRefresh={list.fetchSchedules}
      />
    </>
  )
}
