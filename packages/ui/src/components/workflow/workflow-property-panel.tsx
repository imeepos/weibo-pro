'use client'

import React, { ReactNode } from 'react'
import { cn } from '@udecode/cn'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

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
  value: string
  onChange: (value: string) => void
  onRemove: () => void
  placeholder?: string
  className?: string
}

export function DynamicPortItem({
  value,
  onChange,
  onRemove,
  placeholder = '端口名称',
  className,
}: DynamicPortItemProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg',
      'bg-accent/50 dark:bg-accent/30',
      className
    )}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-xs flex-1 bg-card text-foreground"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        删除
      </Button>
    </div>
  )
}
