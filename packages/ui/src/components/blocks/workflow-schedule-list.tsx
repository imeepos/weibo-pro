import React from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  Repeat,
  Hand,
  Play,
  Power,
  PowerOff,
  Edit3,
  Trash2
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { WorkflowScheduleEntity, ScheduleType, ScheduleStatus } from '@sker/sdk'

interface WorkflowScheduleListProps {
  schedules: WorkflowScheduleEntity[]
  onTrigger?: (schedule: WorkflowScheduleEntity) => void
  onEdit?: (schedule: WorkflowScheduleEntity) => void
  onDelete?: (schedule: WorkflowScheduleEntity) => void
  onToggleStatus?: (schedule: WorkflowScheduleEntity) => void
}

const scheduleTypeLabels: Record<ScheduleType, string> = {
  once: '一次性',
  cron: 'Cron',
  interval: '间隔',
  manual: '手动'
}

const scheduleTypeIcons: Record<ScheduleType, React.ComponentType<{ className?: string }>> = {
  once: Calendar,
  cron: Clock,
  interval: Repeat,
  manual: Hand
}

const scheduleStatusColors: Record<ScheduleStatus, 'default' | 'success' | 'destructive'> = {
  enabled: 'success',
  disabled: 'default',
  expired: 'destructive'
}

const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
  expired: '过期'
}

export function WorkflowScheduleList({
  schedules,
  onTrigger,
  onEdit,
  onDelete,
  onToggleStatus
}: WorkflowScheduleListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>调度名称</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>表达式</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>上次运行</TableHead>
          <TableHead>下次运行</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground h-32">
              暂无调度配置
            </TableCell>
          </TableRow>
        ) : (
          schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell className="font-medium">{schedule.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="inline-flex items-center gap-1">
                  {React.createElement(scheduleTypeIcons[schedule.scheduleType], {
                    className: 'w-3 h-3'
                  })}
                  {scheduleTypeLabels[schedule.scheduleType]}
                </Badge>
              </TableCell>
              <TableCell>
                {schedule.scheduleType === 'cron' && schedule.cronExpression}
                {schedule.scheduleType === 'interval' && `${schedule.intervalSeconds}秒`}
                {(schedule.scheduleType === 'once' || schedule.scheduleType === 'manual') && '-'}
              </TableCell>
              <TableCell>
                <Badge variant={scheduleStatusColors[schedule.status]}>
                  {scheduleStatusLabels[schedule.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {schedule.lastRunAt
                  ? formatDistanceToNow(new Date(schedule.lastRunAt), {
                      addSuffix: true,
                      locale: zhCN
                    })
                  : '-'}
              </TableCell>
              <TableCell>
                {schedule.nextRunAt
                  ? format(new Date(schedule.nextRunAt), 'yyyy-MM-dd HH:mm:ss')
                  : '-'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {onTrigger && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTrigger(schedule)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    立即执行
                  </Button>
                )}
                {onToggleStatus && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleStatus(schedule)}
                  >
                    {schedule.status === 'enabled' ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-1" />
                        禁用
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-1" />
                        启用
                      </>
                    )}
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(schedule)}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(schedule)}
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
