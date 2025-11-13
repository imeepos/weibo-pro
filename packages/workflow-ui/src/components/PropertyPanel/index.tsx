'use client'

import React from 'react'
import { useSelectedNode } from './useSelectedNode'
import { SmartFormField } from './SmartFormField'
import { useReactFlow } from '@xyflow/react'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'
export interface PropertyPanelProps {
  className?: string
}

export function PropertyPanel({ className = '' }: PropertyPanelProps) {
  const selectedNode = useSelectedNode()
  const { setNodes } = useReactFlow()

  if (!selectedNode) {
    return (
      <div className={`property-panel ${className}`}>
        <div className="property-panel-empty">
          <p>未选中节点</p>
          <p className="property-panel-hint">点击节点以编辑其属性</p>
        </div>
      </div>
    )
  }

  const metadata = getNodeMetadata(resolveConstructor(selectedNode.data))
  const ast = selectedNode.data

  const handlePropertyChange = (property: string, value: any) => {
    // 更新 Ast 实例
    ;(ast as any)[property] = value

    // 更新节点数据
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, ast } }
          : node
      )
    )
  }

  // 获取可编辑的属性（输入属性）
  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    value: (ast as any)[input.property],
  }))

  // 获取只读属性（输出属性）
  const readonlyProperties = metadata.outputs.map((output) => ({
    ...output,
    value: (ast as any)[output.property],
  }))

  return (
    <div className={`property-panel ${className}`}>
      <div className="property-panel-header">
        <h3 className="property-panel-title">{metadata.label}</h3>
        <span className="property-panel-type">{metadata.type}</span>
      </div>

      <div className="property-panel-content">
        {editableProperties.length > 0 && (
          <div className="property-panel-section">
            <h4 className="property-panel-section-title">输入属性</h4>
            {editableProperties.map((prop) => (
              <SmartFormField
                key={prop.property}
                label={prop.label || prop.property}
                value={prop.value}
                type={prop.type}
                onChange={(value) => handlePropertyChange(prop.property, value)}
              />
            ))}
          </div>
        )}

        {readonlyProperties.length > 0 && (
          <div className="property-panel-section">
            <h4 className="property-panel-section-title">输出属性（只读）</h4>
            {readonlyProperties.map((prop) => (
              <div key={prop.property} className="property-field property-field-readonly">
                <label className="property-field-label">
                  {prop.label || prop.property}
                </label>
                <div className="property-field-value">
                  {JSON.stringify(prop.value)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="property-panel-section">
          <h4 className="property-panel-section-title">系统属性</h4>
          <div className="property-field property-field-readonly">
            <label className="property-field-label">节点 ID</label>
            <div className="property-field-value">{selectedNode.id}</div>
          </div>
          <div className="property-field property-field-readonly">
            <label className="property-field-label">状态</label>
            <div className="property-field-value">{selectedNode.data.state}</div>
          </div>
          {selectedNode.data.error && (
            <div className="property-field property-field-readonly">
              <label className="property-field-label">错误</label>
              <div className="property-field-value property-field-error">
                {selectedNode.data.error.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
