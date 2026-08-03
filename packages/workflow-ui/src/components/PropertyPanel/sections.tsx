'use client'

import React from 'react'
import { SmartFormField } from './SmartFormField'
import { ErrorDetailPanel } from '../ErrorDetail'
import { SerializedError } from '@sker/core'
import {
  PropertyPanelField,
  DynamicPortItem,
  NodeStateBadge,
  type PropertySection,
  type InputFieldType,
} from '@sker/ui/components/workflow'
import { Button } from '@sker/ui/components/ui/button'
import { INode, INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'
import { extractValue } from './extractValue'

export interface BasicSectionProps {
  formData: INode
  metadata: any
  handlePropertyChange: (property: string, value: any) => void
}

export function buildBasicSection({
  formData,
  metadata,
  handlePropertyChange,
}: BasicSectionProps): PropertySection {
  return {
    id: 'basic',
    title: '基础信息',
    color: 'info',
    defaultOpen: true,
    content: (
      <>
        <SmartFormField
          label="节点名称"
          value={formData.name || metadata.class.title}
          type="string"
          onChange={(value) => handlePropertyChange('name', value)}
        />
        <SmartFormField
          label="节点描述"
          value={formData.description || ''}
          type="textarea"
          onChange={(value) => handlePropertyChange('description', value)}
        />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            节点颜色
          </label>
          <input
            type="color"
            value={formData.color || '#3b82f6'}
            onChange={(e) => handlePropertyChange('color', e.target.value)}
            className="w-full h-10 rounded-lg border border-border bg-card cursor-pointer"
          />
        </div>
      </>
    ),
  }
}

export function buildCustomSettingSection({
  ast,
  formData,
  settingRenderer,
  handlePropertyChange,
}: {
  ast: any
  formData: INode
  settingRenderer: any
  handlePropertyChange: (property: string, value: any) => void
}): PropertySection {
  // 合并 formData 到 ast，确保 Setting 组件能获取最新状态
  const mergedAst = { ...ast, ...formData } as typeof ast
  return {
    id: 'custom-setting',
    title: '节点设置',
    color: 'primary',
    defaultOpen: true,
    content: settingRenderer(mergedAst, handlePropertyChange),
  }
}

export interface InputsSectionProps {
  formData: INode
  ast: any
  editableProperties: any[]
  handlePropertyChange: (property: string, value: any) => void
}

export function buildInputsSection({
  formData,
  ast,
  editableProperties,
  handlePropertyChange,
}: InputsSectionProps): PropertySection {
  return {
    id: 'inputs',
    title: '输入参数',
    color: 'primary',
    defaultOpen: true,
    content: (
      <>
        {editableProperties.map((prop) => (
          <div key={prop.property} className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="block text-xs font-medium text-muted-foreground">
                {prop.label || prop.property}
              </label>
            </div>
            <SmartFormField
              label=""
              value={formData[prop.property] ?? (ast as any)[prop.property] ?? prop.defaultValue}
              type={prop.type as InputFieldType}
              options={prop.options}
              onChange={(value) => handlePropertyChange(prop.property, value)}
            />
          </div>
        ))}
      </>
    ),
  }
}

export function buildOutputsSection({ readonlyProperties }: { readonlyProperties: any[] }): PropertySection {
  return {
    id: 'outputs',
    title: '输出结果',
    color: 'success',
    defaultOpen: false,
    content: (
      <>
        {readonlyProperties.map((prop) => (
          <PropertyPanelField
            key={prop.property}
            label={prop.label || prop.property}
            value={prop.value}
            readonly
          />
        ))}
      </>
    ),
  }
}

export interface DynamicPortsSectionProps {
  supportsDynamicInputs: boolean
  supportsDynamicOutputs: boolean
  currentDynamicInputs: INodeInputMetadata[]
  currentDynamicOutputs: INodeOutputMetadata[]
  onAddPort: (portType: 'input' | 'output') => void
  onEditPort: (property: string, portType: 'input' | 'output') => void
  onRemoveInput: (property: string) => void
  onRemoveOutput: (property: string) => void
}

export function buildDynamicPortsSection({
  supportsDynamicInputs,
  supportsDynamicOutputs,
  currentDynamicInputs,
  currentDynamicOutputs,
  onAddPort,
  onEditPort,
  onRemoveInput,
  onRemoveOutput,
}: DynamicPortsSectionProps): PropertySection {
  return {
    id: 'dynamic-ports',
    title: '动态端口管理',
    color: 'warning',
    defaultOpen: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          {supportsDynamicInputs && <div className="flex items-center justify-between">
            <span className="text-xs font-medium">输入端口 ({currentDynamicInputs.length})</span>
            <Button variant="outline" size="sm" onClick={() => onAddPort('input')}>
              添加输入
            </Button>
          </div>}

          {currentDynamicInputs.map((input, index) => (
            <DynamicPortItem
              key={`${input.property}-${index}`}
              property={input.property}
              title={input.title}
              description={input.description}
              type={input.type}
              isStatic={input.isStatic !== false}
              required={input.required}
              defaultValue={input.defaultValue}
              onEdit={() => onEditPort(input.property, 'input')}
              onRemove={input.isStatic !== false ? undefined : () => onRemoveInput(input.property)}
            />
          ))}
        </div>
        <div className="space-y-2">
          {supportsDynamicOutputs && <div className="flex items-center justify-between">
            <span className="text-xs font-medium">输出端口 ({currentDynamicOutputs.length})</span>
            <Button variant="outline" size="sm" onClick={() => onAddPort('output')}>
              添加输出
            </Button>
          </div>}

          {currentDynamicOutputs.map((output, index) => (
            <DynamicPortItem
              key={`${output.property}-${index}`}
              property={output.property}
              title={output.title}
              description={output.description}
              type={output.type}
              isStatic={output.isStatic !== false}
              isRouter={output.isRouter}
              condition={output.condition}
              defaultValue={output.defaultValue}
              onEdit={() => onEditPort(output.property, 'output')}
              onRemove={output.isStatic !== false ? undefined : () => onRemoveOutput(output.property)}
            />
          ))}
        </div>
      </div>
    ),
  }
}

export function buildInfoSection({ selectedNode }: { selectedNode: any }): PropertySection {
  return {
    id: 'info',
    title: '节点信息',
    color: 'secondary',
    defaultOpen: false,
    content: (
      <>
        <PropertyPanelField label="节点ID" value={selectedNode.id} readonly />
        <div className="space-y-1.5 opacity-70">
          <label className="block text-xs font-medium text-muted-foreground mb-1">运行状态</label>
          <div className="text-xs">
            <NodeStateBadge state={selectedNode.data.state || 'idle'} />
          </div>
        </div>
        {selectedNode.data.error && selectedNode.data.state === 'fail' && (
          <div className="space-y-1.5 opacity-70">
            <label className="block text-xs font-medium text-muted-foreground mb-1">错误信息</label>
            <div className="bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/30">
              <ErrorDetailPanel error={selectedNode.data.error as SerializedError} />
            </div>
          </div>
        )}
      </>
    ),
  }
}

export function buildReadonlyProperties(outputs: any[], ast: any): any[] {
  return outputs.map((output) => ({
    ...output,
    label: output.title || output.property,
    value: extractValue((ast as any)[output.property]),
  }))
}
