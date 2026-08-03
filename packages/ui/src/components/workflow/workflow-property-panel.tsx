'use client'

import React, { ReactNode } from 'react'
import { cn } from '@udecode/cn'
import { Accordion } from '../ui/accordion'
import { PropertyPanelSection } from './property-panel-section'

export { PropertyPanelSection } from './property-panel-section'
export type { PropertyPanelSectionProps } from './property-panel-section'
export { PropertyPanelEmptyState } from './property-panel-empty-state'
export type { PropertyPanelEmptyStateProps } from './property-panel-empty-state'
export { PropertyPanelField } from './property-panel-field'
export type { PropertyPanelFieldProps } from './property-panel-field'
export { NodeStateBadge } from './node-state-badge'
export type { NodeStateBadgeProps } from './node-state-badge'
export { DynamicPortItem } from './dynamic-port-item'
export type { DynamicPortItemProps } from './dynamic-port-item'

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
