'use client'

import { useState, useEffect, useCallback } from 'react'
import { type WorkflowRunEntity, RunStatus, WorkflowController } from '@sker/sdk'
import { root } from '@sker/core'

export interface UseRunHistoryParams {
  visible: boolean
  workflowId: string
  scheduleId?: string
  onViewDetail?: (run: WorkflowRunEntity) => void
}

export function useRunHistory({
  visible,
  workflowId,
  scheduleId,
  onViewDetail,
}: UseRunHistoryParams) {
  const [runs, setRuns] = useState<WorkflowRunEntity[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<RunStatus | undefined>()
  const [selectedRun, setSelectedRun] = useState<WorkflowRunEntity | null>(null)

  const loadRuns = useCallback(async () => {
    setLoading(true)
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      const result = await controller.listRuns({
        workflowId,
        page,
        pageSize,
        status: statusFilter,
        scheduleId,
      })

      setRuns(result.runs)
      setTotal(result.total)
    } catch (error) {
      console.error('加载运行历史失败', error)
    } finally {
      setLoading(false)
    }
  }, [workflowId, page, pageSize, statusFilter, scheduleId])

  useEffect(() => {
    if (visible) {
      loadRuns()
    }
  }, [visible, page, statusFilter, workflowId, scheduleId, loadRuns])

  const handleViewDetail = async (runId: string) => {
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      const run = await controller.getRun(runId)

      setSelectedRun(run)
      onViewDetail?.(run)
    } catch (error) {
      console.error('加载运行详情失败', error)
    }
  }

  const handleCancelRun = async (runId: string) => {
    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      await controller.cancelRun({ runId })
      loadRuns()
    } catch (error) {
      console.error('取消运行失败', error)
    }
  }

  return {
    runs,
    total,
    page,
    pageSize,
    setPage,
    loading,
    statusFilter,
    setStatusFilter,
    selectedRun,
    setSelectedRun,
    handleViewDetail,
    handleCancelRun,
  }
}
