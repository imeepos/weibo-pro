import React from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Edit3,
  Calendar,
  PlayCircle,
  Trash2,
  Tag
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { WorkflowSummary } from '@sker/sdk'

interface WorkflowListProps {
  workflows: WorkflowSummary[]
  onEdit?: (workflow: WorkflowSummary) => void
  onDelete?: (workflow: WorkflowSummary) => void
  onViewSchedules?: (workflow: WorkflowSummary) => void
  onViewRuns?: (workflow: WorkflowSummary) => void
}

export function WorkflowList({
  workflows,
  onEdit,
  onDelete,
  onViewSchedules,
  onViewRuns
}: WorkflowListProps) {
  const navigate = useNavigate()

  const handleEdit = (workflow: WorkflowSummary) => {
    if (onEdit) {
      onEdit(workflow)
    } else {
      navigate(`/workflow-editor/${workflow.name}`)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>工作流名称</TableHead>
          <TableHead>标签</TableHead>
          <TableHead>简洁</TableHead>
          <TableHead>创建时间</TableHead>
          <TableHead>更新时间</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workflows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
              暂无工作流
            </TableCell>
          </TableRow>
        ) : (
          workflows.map((workflow) => (
            <TableRow key={workflow.id}>
              <TableCell className="font-medium">{workflow.name}</TableCell>
              <TableCell>
                {workflow.tags && workflow.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {workflow.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">暂无标签</span>
                )}
              </TableCell>
              <TableCell>
                {workflow.description ? (
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {workflow.description}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">暂无简洁</span>
                )}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(workflow.createdAt), {
                  addSuffix: true,
                  locale: zhCN
                })}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(workflow.updatedAt), {
                  addSuffix: true,
                  locale: zhCN
                })}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(workflow)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  编辑
                </Button>
                {onViewSchedules && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewSchedules(workflow)}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    调度
                  </Button>
                )}
                {onViewRuns && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewRuns(workflow)}
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    执行记录
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(workflow)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    删除
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
