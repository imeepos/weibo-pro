import * as React from "react"
import { type LucideIcon, Copy, Check } from "lucide-react"

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
  isManual?: boolean
  scheduleId?: string
  apiBaseUrl?: string
  triggering?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onTrigger?: () => void
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
  isManual = false,
  scheduleId,
  apiBaseUrl,
  triggering = false,
  onToggle,
  onEdit,
  onDelete,
  onTrigger,
  className,
}: ScheduleCardProps) {
  const StatusIcon = status.icon
  const TypeIcon = type.icon
  const [copied, setCopied] = React.useState(false)

  const triggerUrl = scheduleId && apiBaseUrl
    ? `${apiBaseUrl}/api/workflow/schedules/${scheduleId}/trigger`
    : ''

  const handleCopy = async () => {
    if (!triggerUrl) return

    try {
      await navigator.clipboard.writeText(triggerUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败', err)
    }
  }

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

        {(nextRunAt || lastRunAt || (isManual && triggerUrl)) && (
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
            {isManual && triggerUrl && (
              <div className="space-y-1.5 rounded-md bg-muted/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">触发接口</span>
                  <Badge variant="outline" className="text-[10px]">POST</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <code className="flex-1 truncate rounded bg-background px-1.5 py-0.5 text-[10px] font-mono">
                    {triggerUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={handleCopy}
                    title="复制接口地址"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" strokeWidth={2.5} />
                    ) : (
                      <Copy className="h-3 w-3" strokeWidth={2} />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-border flex items-center gap-2 border-t pt-3">
          {isManual && onTrigger && (
            <Button
              variant="default"
              size="sm"
              onClick={onTrigger}
              className="flex-1"
              disabled={!enabled || expired || triggering}
            >
              {triggering ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  触发中...
                </>
              ) : (
                '触发'
              )}
            </Button>
          )}
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
