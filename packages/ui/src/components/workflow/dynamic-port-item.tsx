'use client'

import React, { ReactNode } from 'react'
import { Edit2, Trash2, Lock, GitBranch, Hash, Type } from 'lucide-react'
import { cn } from '@udecode/cn'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

export interface DynamicPortItemProps {
  property: string
  title?: string
  description?: string
  type?: string
  isStatic?: boolean
  isRouter?: boolean
  condition?: string
  required?: boolean
  defaultValue?: any
  onEdit: () => void
  onRemove?: () => void
  className?: string
  children?: ReactNode
}

function getPortTypeIcon(_type: string) {
  return <Type className="h-3 w-3 text-muted-foreground" />
}

function _getPortTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    string: '字符串',
    text: '多行文本',
    number: '数字',
    boolean: '布尔值',
    date: '日期',
    select: '选择',
    image: '图片',
    video: '视频',
    audio: '音频',
    object: '对象',
    array: '数组',
    any: '任意',
  }
  return typeLabels[type] || type
}

export function DynamicPortItem({
  property,
  title,
  description = '',
  type = 'string',
  isStatic = false,
  isRouter = false,
  condition = '',
  required = false,
  defaultValue,
  onEdit,
  onRemove,
  className,
  children,
}: DynamicPortItemProps) {
  return (
    <div className={cn(
      'flex flex-col gap-2 p-3 rounded-lg transition-colors',
      'bg-accent/50 dark:bg-accent/30',
      'hover:bg-accent/70 dark:hover:bg-accent/50',
      isStatic && 'border-l-2 border-primary/50',
      isRouter && 'border-l-2 border-amber-500/50',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getPortTypeIcon(type)}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {title || property}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span className="font-mono truncate">{property}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isRouter && (
            <GitBranch className="h-3 w-3 text-amber-500" />
          )}
          {required && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1">
              必填
            </Badge>
          )}
          {isStatic && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-6 w-6"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          {!isStatic && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}

      {condition && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-card/50 px-2 py-1 rounded">
          <span>条件:</span>
          <code className="font-mono text-amber-600 dark:text-amber-400">{condition}</code>
        </div>
      )}

      {defaultValue !== undefined && defaultValue !== '' && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>默认:</span>
          <code className="font-mono">{String(defaultValue)}</code>
        </div>
      )}

      {isStatic && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" />
          装饰器定义（不可删除）
        </div>
      )}

      {children}
    </div>
  )
}
