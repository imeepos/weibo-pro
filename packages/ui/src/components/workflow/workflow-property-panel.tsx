'use client'

import React, { ReactNode } from 'react'
import { Edit2, Trash2, Lock, GitBranch, Hash, Type } from 'lucide-react'
import { cn } from '@udecode/cn'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

export interface PropertySection {
  id: string
  title: string
  color?: string
  content: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
}

export interface WorkflowPropertyPanelProps {
  sections?: PropertySection[]
  emptyState?: ReactNode
  className?: string
  defaultOpenSections?: string[]
}

export function WorkflowPropertyPanel({
  sections = [],
  emptyState,
  className,
  defaultOpenSections,
}: WorkflowPropertyPanelProps) {
  if (!sections.length && emptyState) {
    return (
      <div className={cn('flex flex-col h-full border-l bg-card border-border', className)}>
        {emptyState}
      </div>
    )
  }

  // 默认全部折叠，除非显式指定
  const defaultValue = defaultOpenSections ?? []

  return (
    <div className={cn('flex flex-col h-full border-l bg-card border-border', className)}>
      <div className="flex-1 overflow-y-auto p-4">
        <Accordion type="multiple" defaultValue={defaultValue} className="space-y-2">
          {sections.map((section) => (
            <PropertyPanelSection
              key={section.id}
              id={section.id}
              title={section.title}
              color={section.color}
              actions={section.actions}
            >
              {section.content}
            </PropertyPanelSection>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

export interface PropertyPanelSectionProps {
  id: string
  title: string
  color?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function PropertyPanelSection({
  id,
  title,
  color = 'primary',
  actions,
  children,
  className,
}: PropertyPanelSectionProps) {
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    secondary: 'bg-secondary',
  }

  return (
    <AccordionItem value={id} className={cn('border-border rounded-lg overflow-hidden', className)}>
      <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50 data-[state=open]:bg-accent/30">
        <div className="flex items-center justify-between flex-1 mr-2">
          <div className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', colorClasses[color as keyof typeof colorClasses] || 'bg-primary')} />
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </div>
          {actions && <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3 pt-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  )
}

export interface PropertyPanelEmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  className?: string
}

export function PropertyPanelEmptyState({
  icon,
  title = '未选中节点',
  description = '点击画布中的节点查看详细属性',
  className,
}: PropertyPanelEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full text-center p-4', className)}>
      <div className="text-muted-foreground mb-4">
        {icon || (
          <svg className="h-12 w-12 mx-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.037-.502.068-.75.097h-1.5c-.249-.03-.5-.06-.75-.097L4.5 3.104M14.25 3.104v5.714c0 .828.312 1.591.878 2.121l4.5 4.5M14.25 3.104c.251.037.502.068.75.097h1.5c.249-.03.5-.06.75-.097l2.25-2.403M12 18.75a6 6 0 00-6-6H4.5a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6v-.75zm6-12a6 6 0 00-6-6h-.75a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6V6.75z"
            />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-2">{description}</p>
    </div>
  )
}

export interface PropertyPanelFieldProps {
  label: string
  value: any
  readonly?: boolean
  className?: string
}

export function PropertyPanelField({
  label,
  value,
  readonly = false,
  className,
}: PropertyPanelFieldProps) {
  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')

  return (
    <div className={cn('space-y-1.5', readonly && 'opacity-70', className)}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <div className="text-xs text-foreground font-mono bg-card/50 px-3 py-2 rounded-lg border border-border/50 break-all">
        {displayValue}
      </div>
    </div>
  )
}

export interface NodeStateBadgeProps {
  state: 'running' | 'success' | 'fail' | 'idle' | string
  className?: string
}

export function NodeStateBadge({ state, className }: NodeStateBadgeProps) {
  const stateConfig = {
    running: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    fail: 'bg-red-500/20 text-red-300 border-red-500/30',
    idle: 'bg-muted/20 text-muted-foreground border-border',
  }

  const badgeClass = stateConfig[state as keyof typeof stateConfig] || stateConfig.idle

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize',
        badgeClass,
        className
      )}
    >
      {state}
    </span>
  )
}

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
