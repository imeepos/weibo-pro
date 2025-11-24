'use client'

import React, { useState, useEffect } from 'react'
import { Clock, MoreHorizontal, Edit2, Trash2, CheckCircle, XCircle, Pause } from 'lucide-react'
import { WorkflowController } from '@sker/sdk'
import { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import { ScheduleDialog } from './ScheduleDialog'

/**
 * 调度列表
 *
 * 存在即合理:
 * - 展示工作流的调度计划
 * - 管理调度状态(启用/禁用)
 * - 删除和编辑调度
 *
 * 优雅设计:
 * - 手工打造的 UI,无外部依赖
 * - 清晰的状态展示
 * - 优雅的交互动画
 */
export interface ScheduleListProps {
  workflowName: string
  className?: string
}

type ScheduleStatus = 'enabled' | 'disabled' | 'expired'
type ScheduleType = 'cron' | 'interval' | 'once' | 'manual'

interface StatusConfig {
  label: string
  color: string
  icon: typeof CheckCircle
}

interface TypeConfig {
  label: string
  color: string
}

const STATUS_CONFIG: Record<ScheduleStatus, StatusConfig> = {
  enabled: { label: '启用', color: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400', icon: CheckCircle },
  disabled: { label: '禁用', color: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400', icon: Pause },
  expired: { label: '过期', color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400', icon: XCircle },
}

const TYPE_CONFIG: Record<ScheduleType, TypeConfig> = {
  cron: { label: 'Cron', color: 'text-blue-600 border-blue-500/30' },
  interval: { label: '间隔', color: 'text-purple-600 border-purple-500/30' },
  once: { label: '一次性', color: 'text-orange-600 border-orange-500/30' },
  manual: { label: '手动', color: 'text-gray-600 border-gray-500/30' },
}

export function ScheduleList({ workflowName, className = '' }: ScheduleListProps) {
  const client = root.get<WorkflowController>(WorkflowController) as any
  const [schedules, setSchedules] = useState<WorkflowScheduleEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editSchedule, setEditSchedule] = useState<WorkflowScheduleEntity | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const fetchSchedules = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await client.listSchedules(workflowName)
      setSchedules(data)
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '获取调度列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [workflowName])

  const handleToggleStatus = async (schedule: WorkflowScheduleEntity) => {
    try {
      if (schedule.status === 'enabled') {
        await client.disableSchedule(schedule.id)
      } else {
        await client.enableSchedule(schedule.id)
      }
      await fetchSchedules()
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '更新调度状态失败')
    }
  }

  const handleDelete = async (scheduleId: number) => {
    if (!confirm('确定要删除这个调度吗?此操作不可恢复。')) {
      return
    }

    try {
      await client.deleteSchedule(scheduleId)
      await fetchSchedules()
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || '删除调度失败')
    }
  }

  const handleEdit = (schedule: WorkflowScheduleEntity) => {
    setEditSchedule(schedule)
    setOpenMenuId(null)
  }

  const getScheduleDescription = (schedule: WorkflowScheduleEntity): string => {
    switch (schedule.scheduleType) {
      case 'cron':
        return `Cron: ${schedule.cronExpression}`
      case 'interval':
        return `每 ${schedule.intervalSeconds} 秒`
      case 'once':
        return '一次性执行'
      case 'manual':
        return '手动触发'
      default:
        return '未知类型'
    }
  }

  const formatDateTime = (date: string | Date): string => {
    if (!date) return '-'
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  }

  if (loading) {
    return (
      <div className={`rounded-2xl border border-[#2f3543] bg-[#111318] ${className}`}>
        <div className="border-b border-[#2f3543] p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[#135bec]" strokeWidth={1.8} />
            <h3 className="text-lg font-semibold text-white">调度管理</h3>
          </div>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="animate-pulse text-[#6c7a91]">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`rounded-2xl border border-[#2f3543] bg-[#111318] ${className}`}>
        <div className="flex items-center justify-between border-b border-[#2f3543] p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[#135bec]" strokeWidth={1.8} />
            <div>
              <h3 className="text-lg font-semibold text-white">调度管理</h3>
              <p className="text-sm text-[#6c7a91]">{schedules.length} 个调度计划</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-100">{error}</p>
            </div>
          )}

          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-4 h-12 w-12 text-[#6c7a91] opacity-50" strokeWidth={1.5} />
              <p className="text-[#6c7a91]">暂无调度计划</p>
              <p className="mt-1 text-sm text-[#6c7a91]">点击上方"创建调度"按钮添加第一个调度</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2f3543]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">描述</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">下次执行</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">上次执行</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#9da6b9]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => {
                    const statusConfig = STATUS_CONFIG[schedule.status as ScheduleStatus]
                    const typeConfig = TYPE_CONFIG[schedule.scheduleType as ScheduleType]
                    const StatusIcon = statusConfig.icon

                    return (
                      <tr key={schedule.id} className="border-b border-[#2f3543] hover:bg-[#1a1d24]">
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" strokeWidth={2} />
                            {statusConfig.label}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-white">{schedule.name}</td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium ${typeConfig.color}`}>
                            {typeConfig.label}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9da6b9]">
                          {getScheduleDescription(schedule)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9da6b9]">
                          {schedule.nextRunAt ? formatDateTime(schedule.nextRunAt) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9da6b9]">
                          {schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={schedule.status === 'enabled'}
                                onChange={() => handleToggleStatus(schedule)}
                                disabled={schedule.status === 'expired'}
                                className="peer sr-only"
                              />
                              <div className="peer h-5 w-9 rounded-full bg-[#2f3543] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#135bec] peer-checked:after:translate-x-full peer-disabled:opacity-50"></div>
                            </label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenMenuId(openMenuId === schedule.id ? null : schedule.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9da6b9] transition hover:bg-[#1f2531] hover:text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
                              </button>
                              {openMenuId === schedule.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-[#2f3543] bg-[#1a1d24] py-1 shadow-xl">
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(schedule)}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white hover:bg-[#1f2531]"
                                    >
                                      <Edit2 className="h-4 w-4" strokeWidth={1.8} />
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(schedule.id)}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[#1f2531]"
                                    >
                                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                                      删除
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editSchedule && (
        <ScheduleDialog
          workflowName={workflowName}
          open={!!editSchedule}
          onOpenChange={(open) => !open && setEditSchedule(null)}
          onSuccess={fetchSchedules}
        />
      )}
    </>
  )
}
