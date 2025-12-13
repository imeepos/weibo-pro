import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { root } from '@sker/core'
import {
  WorkflowController,
  type WorkflowSummary,
  type WorkflowScheduleEntity,
  type WorkflowRunEntity
} from '@sker/sdk'
import { Spinner } from '@sker/ui/components/ui/spinner'
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card'
import { Input } from '@sker/ui/components/ui/input'
import { Button } from '@sker/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@sker/ui/components/ui/dialog'
import {
  WorkflowList,
} from '@sker/ui/components/blocks/workflow-list'
import {
  WorkflowRunList
} from '@sker/ui/components/blocks/workflow-run-list'
import {
  WorkflowScheduleList,
} from '@sker/ui/components/blocks/workflow-schedule-list'
import { HomeIcon, SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react'

export default function WorkflowManagement() {
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
  const [workflowPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'schedules' | 'runs'>('schedules')

  useEffect(() => {
    loadWorkflows()
  }, [])

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

  useEffect(() => {
    const startIndex = (workflowPage - 1) * workflowPageSize
    const endIndex = startIndex + workflowPageSize
    setPaginatedWorkflows(filteredWorkflows.slice(startIndex, endIndex))
  }, [filteredWorkflows, workflowPage, workflowPageSize])

  const loadWorkflows = async () => {
    setLoading(true)
    try {
      const data = await workflowCtrl.listWorkflows()
      setWorkflows(data)
      setFilteredWorkflows(data)
    } finally {
      setLoading(false)
    }
  }

  const loadSchedules = async (workflowName: string) => {
    try {
      const data = await workflowCtrl.listSchedules(workflowName)
      setSchedules(data)
    } catch (error) {
      console.error('加载调度失败:', error)
    }
  }

  const loadRuns = async (workflowId: string, page: number = 1) => {
    try {
      const data = await workflowCtrl.listRuns({
        workflowId,
        page,
        pageSize: 20
      })
      setRuns(data.runs)
      setRunsTotal(data.total)
      setRunsPage(page)
    } catch (error) {
      console.error('加载执行记录失败:', error)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <h1 className="text-2xl font-bold">工作流管理</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>工作流列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索工作流名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <WorkflowList
            workflows={paginatedWorkflows}
            onViewSchedules={handleViewSchedules}
            onViewRuns={handleViewRuns}
          />
          {filteredWorkflows.length > workflowPageSize && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                共 {filteredWorkflows.length} 个工作流，第 {workflowPage} / {Math.ceil(filteredWorkflows.length / workflowPageSize)} 页
              </div>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={workflowPage <= 1}
                  onClick={() => setWorkflowPage(workflowPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一页
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={workflowPage >= Math.ceil(filteredWorkflows.length / workflowPageSize)}
                  onClick={() => setWorkflowPage(workflowPage + 1)}
                >
                  下一页
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow?.name} - {dialogType === 'schedules' ? '调度配置' : '执行记录'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {dialogType === 'schedules' ? (
              <WorkflowScheduleList
                schedules={schedules}
                onTrigger={handleTriggerSchedule}
                onToggleStatus={handleToggleScheduleStatus}
              />
            ) : (
              <WorkflowRunList
                runs={runs}
                total={runsTotal}
                page={runsPage}
                pageSize={20}
                onCancel={handleCancelRun}
                onPageChange={(page) => selectedWorkflow && loadRuns(selectedWorkflow.id, page)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
