'use client'

import React, { useState } from 'react'
import { cn } from '@udecode/cn'
import { X, LucideIcon } from 'lucide-react'

export interface DrawerTab {
  id: string
  label: string
  icon: LucideIcon
  content: React.ReactNode
}

export interface DrawerAction {
  id: string
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'success' | 'primary' | 'destructive'
}

export interface WorkflowPropertyDrawerProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: LucideIcon
  tabs?: DrawerTab[]
  actions?: DrawerAction[]
  defaultTab?: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  className?: string
}

const actionVariants = {
  default: 'text-slate-400 hover:text-slate-100',
  success: 'text-slate-400 hover:text-green-400',
  primary: 'text-slate-400 hover:text-blue-400',
  destructive: 'text-slate-400 hover:text-red-400',
}

export function WorkflowPropertyDrawer({
  visible,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tabs = [],
  actions = [],
  defaultTab,
  defaultWidth = 420,
  minWidth = 320,
  maxWidth = 800,
  className,
}: WorkflowPropertyDrawerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [width, setWidth] = useState(defaultWidth)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      setWidth(Math.max(minWidth, Math.min(maxWidth, startWidth + delta)))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!visible) return null

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 top-16 z-10',
        'flex flex-col overflow-hidden',
        'bg-card/95 backdrop-blur-xl',
        'rounded-2xl shadow-2xl border border-border/50',
        className
      )}
      style={{ width: `${width}px` }}
    >
      {/* 调整大小控制柄 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-0 w-0.5 bg-border/50 group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions.map((action, index) => {
            const ActionIcon = action.icon
            return (
              <React.Fragment key={action.id}>
                {index > 0 && index === actions.length - 1 && (
                  <div className="h-6 w-px bg-border/50" />
                )}
                <button
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(
                    'w-8 h-8 rounded-lg',
                    'flex items-center justify-center',
                    'transition-colors',
                    action.disabled
                      ? 'text-muted-foreground/50 cursor-not-allowed'
                      : cn(
                          actionVariants[action.variant || 'default'],
                          'hover:bg-accent/50 active:bg-accent/70'
                        )
                  )}
                  title={action.label}
                >
                  <ActionIcon className="w-4 h-4" />
                </button>
              </React.Fragment>
            )
          })}

          {actions.length > 0 && <div className="h-6 w-px bg-border/50" />}

          <button
            onClick={onClose}
            className={cn(
              'w-8 h-8 rounded-lg',
              'flex items-center justify-center',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-accent/50 active:bg-accent/70',
              'transition-colors'
            )}
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-3">
          {tabs.map(tab => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold',
                  'transition-all duration-200',
                  'flex items-center gap-2',
                  activeTab === tab.id
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
                )}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeTabContent}
      </div>
    </div>
  )
}
