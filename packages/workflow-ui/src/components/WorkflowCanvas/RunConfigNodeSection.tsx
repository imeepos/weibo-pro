'use client'

import React from 'react'
import { WorkflowFormField } from '@sker/ui/components/workflow/workflow-form-field'
import type { InputField, NodeSettingRenderer } from './run-config-dialog.types'
import { getPlaceholder } from './run-config-dialog.utils'

export interface RunConfigNodeSectionProps {
  nodeName: string
  fields: InputField[]
  node: any
  settingRenderer?: NodeSettingRenderer
  propChangeWrapper: (property: string, value: any) => void
  onInputChange: (fullKey: string, value: any) => void
}

/**
 * 单个入口节点的参数配置区块
 *
 * - 优先使用 @Setting 渲染器（自定义配置 UI）
 * - 回退到 WorkflowFormField 统一表单
 */
export function RunConfigNodeSection({
  nodeName,
  fields,
  node,
  settingRenderer,
  propChangeWrapper,
  onInputChange,
}: RunConfigNodeSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <h4 className="text-sm font-semibold text-foreground">{nodeName}</h4>
        <span className="text-xs text-muted-foreground">({fields.length} 个参数)</span>
      </div>
      <div className="pl-4">
        {settingRenderer && node ? (
          // 使用稳定的 propChangeWrapper 调用 @Setting 渲染器
          settingRenderer(node, propChangeWrapper)
        ) : (
          // 回退到 WorkflowFormField
          <div className="space-y-3">
            {fields.map((field) => (
              <WorkflowFormField
                key={field.fullKey}
                label={field.propertyLabel}
                value={field.value}
                type={field.type}
                onChange={(value) => onInputChange(field.fullKey, value)}
                placeholder={getPlaceholder(field.propertyKey, field.type)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
