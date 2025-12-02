import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@sker/ui/lib/utils"
import { Card } from "./card"
import { Badge } from "./badge"
import { Switch } from "./switch"
import { Button } from "./button"

/**
 * ScheduleCard - 调度卡片组件
 *
 * 存在即合理: 展示单个调度任务的完整信息
 * 优雅即简约: 组合现有组件，清晰的信息层级
 */

export interface ScheduleCardProps {
  name: string
  description: string
  status: {
    label: string
    color: string
    icon: LucideIcon
  }
  type: {
    label: string
    color: string
    icon: LucideIcon
  }
  enabled: boolean
  expired?: boolean
  nextRunAt?: string
  lastRunAt?: string
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

function ScheduleCard({
  name,
  description,
  status,
  type,
  enabled,
  expired = false,
  nextRunAt,
  lastRunAt,
  onToggle,
  onEdit,
  onDelete,
  className,
}: ScheduleCardProps) {
  const StatusIcon = status.icon
  const TypeIcon = type.icon

  return (
    <Card
      className={cn(
        "group p-4 transition-colors hover:bg-accent/5",
        className
      )}
      data-slot="schedule-card"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="mb-2 truncate text-sm font-semibold">{name}</h4>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("gap-1", status.color)}
              >
                <StatusIcon className="size-3" strokeWidth={2.5} />
                {status.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn("gap-1", type.color)}
              >
                <TypeIcon className="size-3" strokeWidth={2} />
                {type.label}
              </Badge>
            </div>
          </div>

          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={expired}
            aria-label={enabled ? "禁用调度" : "启用调度"}
          />
        </div>

        <p className="text-muted-foreground truncate text-xs">
          {description}
        </p>

        {(nextRunAt || lastRunAt) && (
          <div className="text-muted-foreground space-y-1 text-xs">
            {nextRunAt && (
              <div className="flex items-center justify-between">
                <span className="opacity-70">下次执行</span>
                <span className="font-medium">{nextRunAt}</span>
              </div>
            )}
            {lastRunAt && (
              <div className="flex items-center justify-between">
                <span className="opacity-70">上次执行</span>
                <span>{lastRunAt}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-border flex items-center gap-2 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 flex-1"
          >
            删除
          </Button>
        </div>
      </div>
    </Card>
  )
}

export { ScheduleCard }
