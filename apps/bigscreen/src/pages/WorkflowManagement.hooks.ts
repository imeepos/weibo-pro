import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { root } from '@sker/core'
import {
  WorkflowController,
  type WorkflowSummary,
  type WorkflowScheduleEntity,
  type WorkflowRunEntity
} from '@sker/sdk'

export const WORKFLOW_PAGE_SIZE = 10
export const RUN_PAGE_SIZE = 20

export function useWorkflowManagement() {
  const navigate = useNavigate()
  const workflowCtrl = root.get(WorkflowController)

  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowSummary[]>([])
  const [paginatedWorkflows, setPaginatedWorkflows] = useState<WorkflowSummary[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowSummary | null>(null)
  const [schedules, setSchedules] = useState<WorkflowScheduleEntity[]>([])
  const [runs, setRuns] = useState<WorkflowRunEntity[]>([])
  const [runsTotal, setRunsTotal] = useState(0)
  const [runsPage, setRunsPage] = useState(1)
  const [workflowPage, setWorkflowPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'schedules' | 'runs' | 'create'>('schedules')
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('')

  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      const data = await workflowCtrl.listWorkflows()
      setWorkflows(data)
      setFilteredWorkflows(data)
    } finally {
      setLoading(false)
    }
  }, [workflowCtrl])

  const loadSchedules = useCallback(async (workflowName: string) => {
    try {
      const data = await workflowCtrl.listSchedules(workflowName)
      setSchedules(data)
    } catch (error) {
      console.error('加载调度失败:', error)
    }
  }, [workflowCtrl])

  const loadRuns = useCallback(async (workflowId: string, page: number = 1) => {
    try {
      const data = await workflowCtrl.listRuns({
        workflowId,
        page,
        pageSize: RUN_PAGE_SIZE
      })
      setRuns(data.runs)
      setRunsTotal(data.total)
      setRunsPage(page)
    } catch (error) {
      console.error('加载执行记录失败:', error)
    }
  }, [workflowCtrl])

  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  // 搜索过滤
  useEffect(() => {
    if (searchKeyword.trim()) {
      const filtered = workflows.filter((wf) =>
        wf.name.toLowerCase().includes(searchKeyword.toLowerCase())
      )
      setFilteredWorkflows(filtered)
    } else {
      setFilteredWorkflows(workflows)
    }
    setWorkflowPage(1)
  }, [searchKeyword, workflows])

  // 分页
  useEffect(() => {
    const startIndex = (workflowPage - 1) * WORKFLOW_PAGE_SIZE
    const endIndex = startIndex + WORKFLOW_PAGE_SIZE
    setPaginatedWorkflows(filteredWorkflows.slice(startIndex, endIndex))
  }, [filteredWorkflows, workflowPage])

  const handleViewSchedules = (workflow: WorkflowSummary) => {
    setSelectedWorkflow(workflow)
    setDialogType('schedules')
    setDialogOpen(true)
    loadSchedules(workflow.name)
  }

  const handleViewRuns = (workflow: WorkflowSummary) => {
    setSelectedWorkflow(workflow)
    setDialogType('runs')
    setDialogOpen(true)
    setRunsPage(1)
    loadRuns(workflow.id, 1)
  }

  const handleTriggerSchedule = async (schedule: WorkflowScheduleEntity) => {
    try {
      await workflowCtrl.triggerSchedule(schedule.id, {})
      alert('调度已触发')
      if (selectedWorkflow) {
        loadRuns(selectedWorkflow.id)
      }
    } catch (error) {
      console.error('触发调度失败:', error)
      alert('触发调度失败')
    }
  }

  const handleToggleScheduleStatus = async (schedule: WorkflowScheduleEntity) => {
    try {
      if (schedule.status === 'enabled') {
        await workflowCtrl.disableSchedule(schedule.id)
      } else {
        await workflowCtrl.enableSchedule(schedule.id)
      }
      if (selectedWorkflow) {
        loadSchedules(selectedWorkflow.name)
      }
    } catch (error) {
      console.error('切换调度状态失败:', error)
      alert('切换调度状态失败')
    }
  }

  const handleCancelRun = async (run: WorkflowRunEntity) => {
    try {
      await workflowCtrl.cancelRun({ runId: run.id })
      alert('运行已取消')
      if (selectedWorkflow) {
        loadRuns(selectedWorkflow.id, runsPage)
      }
    } catch (error) {
      console.error('取消运行失败:', error)
      alert('取消运行失败')
    }
  }

  const handleCreateWorkflow = () => {
    if (!newWorkflowName.trim()) {
      alert('请输入工作流名称')
      return
    }
    navigate(`/workflow-editor/${encodeURIComponent(newWorkflowName)}`)
    setDialogOpen(false)
    setNewWorkflowName('')
    setNewWorkflowDescription('')
  }

  const handleOpenCreateDialog = () => {
    setDialogType('create')
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setNewWorkflowName('')
      setNewWorkflowDescription('')
    }
    setDialogOpen(open)
  }

  return {
    workflows,
    filteredWorkflows,
    paginatedWorkflows,
    selectedWorkflow,
    schedules,
    runs,
    runsTotal,
    runsPage,
    workflowPage,
    workflowPageSize: WORKFLOW_PAGE_SIZE,
    loading,
    searchKeyword,
    dialogOpen,
    dialogType,
    newWorkflowName,
    newWorkflowDescription,
    setSearchKeyword,
    setWorkflowPage,
    setNewWorkflowName,
    setNewWorkflowDescription,
    loadRuns,
    handleViewSchedules,
    handleViewRuns,
    handleTriggerSchedule,
    handleToggleScheduleStatus,
    handleCancelRun,
    handleCreateWorkflow,
    handleOpenCreateDialog,
    handleDialogClose,
  }
}
