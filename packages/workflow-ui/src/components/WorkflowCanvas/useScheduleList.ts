'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { WorkflowController } from '@sker/sdk'
import type { WorkflowScheduleEntity } from '@sker/entities'
import { root } from '@sker/core'
import { WorkflowGraphAst, fromJson } from '@sker/workflow'
import { useDebounce } from '@sker/ui/hooks/use-debounce'
import { getScheduleDescription } from './schedule-list-utils'
import { ITEMS_PER_PAGE } from './schedule-list-types'
import type { SortField, SortOrder } from './schedule-list-types'

/**
 * 调度列表 - 状态与业务逻辑 Hook
 *
 * 职责:集中管理调度列表的数据加载、增删改查、触发、搜索/排序/分页状态。
 */
export interface UseScheduleListReturn {
  loading: boolean
  error: string
  searchQuery: string
  setSearchQuery: (value: string) => void
  currentPage: number
  setCurrentPage: (page: number) => void
  sortField: SortField
  sortOrder: SortOrder
  editSchedule: WorkflowScheduleEntity | null
  setEditSchedule: (schedule: WorkflowScheduleEntity | null) => void
  showCreateDialog: boolean
  setShowCreateDialog: (open: boolean) => void
  deleteScheduleId: string | null
  setDeleteScheduleId: (id: string | null) => void
  triggeringIds: Set<string>
  triggerDialogSchedule: WorkflowScheduleEntity | null
  workflowAst: WorkflowGraphAst | null
  effectiveApiBaseUrl: string
  filteredSchedules: WorkflowScheduleEntity[]
  totalPages: number
  paginatedSchedules: WorkflowScheduleEntity[]
  fetchSchedules: () => Promise<void>
  handleToggleStatus: (schedule: WorkflowScheduleEntity) => Promise<void>
  handleDelete: (scheduleId: string) => void
  confirmDelete: () => Promise<void>
  handleTrigger: (schedule: WorkflowScheduleEntity) => Promise<void>
  handleConfirmTrigger: (inputs: Record<string, unknown>) => Promise<void>
  handleCancelTrigger: () => void
  handleEdit: (schedule: WorkflowScheduleEntity) => void
  handleSort: (field: SortField) => void
}

export function useScheduleList(workflowName: string, apiBaseUrl?: string): UseScheduleListReturn {
  const client = root.get<WorkflowController>(WorkflowController) as any
  const [schedules, setSchedules] = useState<WorkflowScheduleEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editSchedule, setEditSchedule] = useState<WorkflowScheduleEntity | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 1000)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [triggeringIds, setTriggeringIds] = useState<Set<string>>(new Set())
  const [triggerDialogSchedule, setTriggerDialogSchedule] = useState<WorkflowScheduleEntity | null>(null)
  const [workflowAst, setWorkflowAst] = useState<WorkflowGraphAst | null>(null)
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)

  // 自动获取 API 基础 URL（如果未提供）
  const effectiveApiBaseUrl = apiBaseUrl || (
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : ''
  )

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

  const handleDelete = (scheduleId: string) => {
    setDeleteScheduleId(scheduleId)
  }

  const confirmDelete = async () => {
    if (!deleteScheduleId) return

    try {
      await client.deleteSchedule(deleteScheduleId)
      await fetchSchedules()
      toast.success('调度已删除')
    } catch (err: unknown) {
      const error = err as Error
      const errorMsg = error.message || '删除调度失败'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setDeleteScheduleId(null)
    }
  }

  const handleTrigger = async (schedule: WorkflowScheduleEntity) => {
    try {
      setError('')
      // 获取工作流 AST
      const workflow = await client.getWorkflow({ name: workflowName })
      if (!workflow) {
        throw new Error('工作流不存在')
      }

      // 反序列化工作流 AST
      const ast = fromJson<WorkflowGraphAst>(workflow)

      // 将保存的 inputs 同步到 workflowAst 的节点对象中
      // 这样 EventSelector 等组件能正确显示当前选中的值
      if (schedule.inputs && ast.nodes) {
        Object.entries(schedule.inputs).forEach(([key, value]) => {
          const [nodeId, propKey] = key.split('.')
          if (nodeId && propKey) {
            const node = ast.nodes.find((n: any) => n.id === nodeId)
            if (node) {
              node[propKey] = value
            }
          }
        })
      }

      // 设置工作流 AST 和调度信息
      setWorkflowAst(ast)
      setTriggerDialogSchedule(schedule)
    } catch (err: unknown) {
      const error = err as Error
      const errorMsg = error.message || '获取工作流失败'
      setError(errorMsg)
      toast.error('打开配置失败', {
        description: errorMsg
      })
    }
  }

  const handleConfirmTrigger = async (inputs: Record<string, unknown>) => {
    if (!triggerDialogSchedule) return

    setTriggeringIds(prev => new Set(prev).add(triggerDialogSchedule.id))

    try {
      setError('')
      const result = await client.triggerSchedule(triggerDialogSchedule.id, { inputs })

      if (result.success) {
        toast.success('调度已触发', {
          description: `运行ID: ${result.runId}`
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      const errorMsg = error.message || '触发调度失败'
      setError(errorMsg)
      toast.error('触发失败', {
        description: errorMsg
      })
    } finally {
      setTriggeringIds(prev => {
        const next = new Set(prev)
        next.delete(triggerDialogSchedule.id)
        return next
      })
      // 关闭对话框
      setTriggerDialogSchedule(null)
      setWorkflowAst(null)
    }
  }

  const handleCancelTrigger = () => {
    setTriggerDialogSchedule(null)
    setWorkflowAst(null)
  }

  const handleEdit = (schedule: WorkflowScheduleEntity) => {
    setEditSchedule(schedule)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules]

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      result = result.filter(schedule =>
        schedule.name.toLowerCase().includes(query) ||
        getScheduleDescription(schedule).toLowerCase().includes(query)
      )
    }

    result.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'nextRunAt': {
          const aTime = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0
          const bTime = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0
          comparison = aTime - bTime
          break
        }
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [schedules, debouncedSearchQuery, sortField, sortOrder])

  const totalPages = Math.ceil(filteredAndSortedSchedules.length / ITEMS_PER_PAGE)
  const paginatedSchedules = filteredAndSortedSchedules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, sortField, sortOrder])

  return {
    loading,
    error,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    sortField,
    sortOrder,
    editSchedule,
    setEditSchedule,
    showCreateDialog,
    setShowCreateDialog,
    deleteScheduleId,
    setDeleteScheduleId,
    triggeringIds,
    triggerDialogSchedule,
    workflowAst,
    effectiveApiBaseUrl,
    filteredSchedules: filteredAndSortedSchedules,
    totalPages,
    paginatedSchedules,
    fetchSchedules,
    handleToggleStatus,
    handleDelete,
    confirmDelete,
    handleTrigger,
    handleConfirmTrigger,
    handleCancelTrigger,
    handleEdit,
    handleSort,
  }
}
