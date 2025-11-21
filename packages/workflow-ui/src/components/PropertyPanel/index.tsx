'use client'

import React, { useState, useEffect } from 'react'
import { useSelectedNode } from './useSelectedNode'
import { SmartFormField } from './SmartFormField'
import { useReactFlow } from '@xyflow/react'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'
import { ErrorDetailPanel } from '../ErrorDetail'
import { SerializedError } from '@sker/core'
import { Save, X } from 'lucide-react'

export interface PropertyPanelProps {
  className?: string
}

export function PropertyPanel({ className = '' }: PropertyPanelProps) {
  const selectedNode = useSelectedNode()
  const { setNodes } = useReactFlow()

  // 表单状态管理
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // 当选中节点变化时，重置表单数据
  useEffect(() => {
    if (selectedNode) {
      const metadata = getNodeMetadata(resolveConstructor(selectedNode.data))
      const initialData: Record<string, any> = {}

      metadata.inputs.forEach((input) => {
        initialData[input.property] = (selectedNode.data as any)[input.property]
      })

      setFormData(initialData)
      setHasChanges(false)
    }
  }, [selectedNode?.id])

  if (!selectedNode) {
    return (
      <div className={`property-panel ${className}`}>
        <div className="property-panel-empty text-center py-12">
          <div className="text-slate-500 mb-4">
            <svg className="h-12 w-12 mx-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.037-.502.068-.75.097h-1.5c-.249-.03-.5-.06-.75-.097L4.5 3.104M14.25 3.104v5.714c0 .828.312 1.591.878 2.121l4.5 4.5M14.25 3.104c.251.037.502.068.75.097h1.5c.249-.03.5-.06.75-.097l2.25-2.403M12 18.75a6 6 0 00-6-6H4.5a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6v-.75zm6-12a6 6 0 00-6-6h-.75a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6V6.75z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">未选中节点</p>
          <p className="text-xs text-slate-500 mt-2">点击画布中的节点查看详细属性</p>
        </div>
      </div>
    )
  }

  const metadata = getNodeMetadata(resolveConstructor(selectedNode.data))
  const ast = selectedNode.data

  // 修改属性时只更新本地状态
  const handlePropertyChange = (property: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [property]: value,
    }))
    setHasChanges(true)
  }

  // 保存表单数据到节点
  const handleSave = () => {
    // 更新 AST 实例
    Object.entries(formData).forEach(([property, value]) => {
      ;(ast as any)[property] = value
    })

    // 更新节点数据，触发画布重新渲染
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data } }
          : node
      )
    )

    setHasChanges(false)
  }

  // 取消修改，恢复原始值
  const handleCancel = () => {
    const initialData: Record<string, any> = {}

    metadata.inputs.forEach((input) => {
      initialData[input.property] = (ast as any)[input.property]
    })

    setFormData(initialData)
    setHasChanges(false)
  }

  // 获取可编辑的属性（输入属性）
  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    value: formData[input.property] ?? (ast as any)[input.property],
  }))

  // 获取只读属性（输出属性）
  const readonlyProperties = metadata.outputs.map((output) => ({
    ...output,
    value: (ast as any)[output.property],
  }))

  return (
    <div className={`property-panel ${className}`}>
      <div className="property-panel-content space-y-6">
        {/* 输入属性 */}
        {editableProperties.length > 0 && (
          <div className="property-panel-section">
            <h4 className="property-panel-section-title text-sm font-semibold text-slate-300 mb-3 flex items-center">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></div>
              输入参数
            </h4>
            <div className="space-y-3">
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

            {/* 保存和取消按钮 */}
            {hasChanges && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700/50">
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-200"
                >
                  <Save className="h-4 w-4" />
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/50 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors duration-200 border border-slate-700/50"
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
              </div>
            )}
          </div>
        )}

        {/* 输出属性 */}
        {readonlyProperties.length > 0 && (
          <div className="property-panel-section">
            <h4 className="property-panel-section-title text-sm font-semibold text-slate-300 mb-3 flex items-center">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
              输出结果
            </h4>
            <div className="space-y-3">
              {readonlyProperties.map((prop) => (
                <div key={prop.property} className="property-field property-field-readonly">
                  <label className="property-field-label text-xs font-medium text-slate-400 mb-1 block">
                    {prop.label || prop.property}
                  </label>
                  <div className="property-field-value text-xs text-slate-300 font-mono bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50 break-all">
                    {JSON.stringify(prop.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 节点信息 */}
        <div className="property-panel-section">
          <h4 className="property-panel-section-title text-sm font-semibold text-slate-300 mb-3 flex items-center">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
            节点信息
          </h4>
          <div className="space-y-3">
            <div className="property-field property-field-readonly">
              <label className="property-field-label text-xs font-medium text-slate-400 mb-1 block">节点ID</label>
              <div className="property-field-value text-xs text-slate-300 font-mono bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
                {selectedNode.id}
              </div>
            </div>
            <div className="property-field property-field-readonly">
              <label className="property-field-label text-xs font-medium text-slate-400 mb-1 block">运行状态</label>
              <div className="property-field-value text-xs capitalize bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedNode.data.state === 'running' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                  selectedNode.data.state === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  selectedNode.data.state === 'fail' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                  'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                }`}>
                  {selectedNode.data.state}
                </span>
              </div>
            </div>
            {selectedNode.data.error && (
              <div className="property-field property-field-readonly">
                <label className="property-field-label text-xs font-medium text-slate-400 mb-1 block">错误信息</label>
                <div className="property-field-value bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
                  <ErrorDetailPanel error={selectedNode.data.error as SerializedError} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
