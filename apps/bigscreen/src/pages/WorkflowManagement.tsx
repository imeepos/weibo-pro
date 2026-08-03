import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@sker/ui/components/ui/spinner'
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card'
import { Input } from '@sker/ui/components/ui/input'
import { Button } from '@sker/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@sker/ui/components/ui/dialog'
import { Label } from '@sker/ui/components/ui/label'
import { Textarea } from '@sker/ui/components/ui/textarea'
import { PlusIcon } from 'lucide-react'
import { WorkflowList } from '@sker/ui/components/blocks/workflow-list'
import { WorkflowRunList } from '@sker/ui/components/blocks/workflow-run-list'
import { WorkflowScheduleList } from '@sker/ui/components/blocks/workflow-schedule-list'
import { HomeIcon, SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useWorkflowManagement } from './WorkflowManagement.hooks'

export default function WorkflowManagement() {
  const navigate = useNavigate()
  const {
    filteredWorkflows,
    paginatedWorkflows,
    selectedWorkflow,
    schedules,
    runs,
    runsTotal,
    runsPage,
    workflowPage,
    workflowPageSize,
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
    handleViewSchedules,
    handleViewRuns,
    handleTriggerSchedule,
    handleToggleScheduleStatus,
    handleCancelRun,
    handleCreateWorkflow,
    loadRuns,
    handleOpenCreateDialog,
    handleDialogClose,
  } = useWorkflowManagement()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  const totalPages = Math.ceil(filteredWorkflows.length / workflowPageSize)

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
        <Button onClick={handleOpenCreateDialog}>
          <PlusIcon className="w-4 h-4 mr-2" />
          新增工作流
        </Button>
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
                共 {filteredWorkflows.length} 个工作流，第 {workflowPage} / {totalPages} 页
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
                  disabled={workflowPage >= totalPages}
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

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className={dialogType === 'create' ? 'max-w-md' : '!max-w-[90vw] !w-[90vw] max-h-[85vh] overflow-y-auto'}>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'create' ? '新增工作流' : `${selectedWorkflow?.name} - ${dialogType === 'schedules' ? '调度配置' : '执行记录'}`}
            </DialogTitle>
            {dialogType === 'create' && (
              <DialogDescription>
                填写工作流基本信息后跳转到编辑器
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="mt-4">
            {dialogType === 'create' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workflow-name">工作流名称 *</Label>
                  <Input
                    id="workflow-name"
                    placeholder="输入工作流名称"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflow-description">描述</Label>
                  <Textarea
                    id="workflow-description"
                    placeholder="输入工作流描述（可选）"
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            ) : dialogType === 'schedules' ? (
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
          {dialogType === 'create' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDialogClose(false)}>
                取消
              </Button>
              <Button onClick={handleCreateWorkflow}>
                创建并编辑
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
