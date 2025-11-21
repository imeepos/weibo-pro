'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Subject } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { useSelectedNode } from './useSelectedNode'
import { SmartFormField } from './SmartFormField'
import { useReactFlow } from '@xyflow/react'
import { getNodeMetadata } from '../../adapters'
import { resolveConstructor } from '@sker/workflow'
import { ErrorDetailPanel } from '../ErrorDetail'
import { SerializedError } from '@sker/core'
import { RotateCcw } from 'lucide-react'

export interface PropertyPanelProps {
  className?: string
}

interface FormChangeEvent {
  nodeId: string
  formData: Record<string, any>
}

export function PropertyPanel({ className = '' }: PropertyPanelProps) {
  const selectedNode = useSelectedNode()
  const { setNodes } = useReactFlow()

  // 表单状态管理
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // RxJS Subject 用于去噪
  const formChange$ = useRef(new Subject<FormChangeEvent>())

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

  // RxJS 订阅：去噪 + 自动保存
  useEffect(() => {
    const subscription = formChange$.current
      .pipe(
        debounceTime(600), // 600ms 去噪
        distinctUntilChanged((prev, curr) =>
          JSON.stringify(prev.formData) === JSON.stringify(curr.formData)
        )
      )
      .subscribe((event) => {
        if (!selectedNode || selectedNode.id !== event.nodeId) return

        setIsSaving(true)

        // 更新 AST 实例
        const ast = selectedNode.data
        Object.entries(event.formData).forEach(([property, value]) => {
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

        // 保存完成
        setTimeout(() => {
          setIsSaving(false)
          setHasChanges(false)
        }, 200)
      })

    return () => subscription.unsubscribe()
  }, [selectedNode, setNodes])

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

  // 修改属性时更新本地状态 + 触发 RxJS 流
  const handlePropertyChange = (property: string, value: any) => {
    const newFormData = {
      ...formData,
      [property]: value,
    }

    setFormData(newFormData)
    setHasChanges(true)

    // 发送到 RxJS 流进行去噪处理
    formChange$.current.next({
      nodeId: selectedNode.id,
      formData: newFormData,
    })
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
        {/* 节点基础信息 */}
        <div className="property-panel-section">
          <h4 className="property-panel-section-title text-sm font-semibold text-slate-300 mb-3 flex items-center">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
            基础信息
          </h4>
          <div className="space-y-3">
            <SmartFormField
              label="节点名称"
              value={selectedNode.data.name || metadata.title}
              type="string"
              onChange={(value) => {
                // 直接修改 AST 实例
                selectedNode.data.name = value;
                // 触发 React Flow 重新渲染
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === selectedNode.id
                      ? { ...node, data: node.data }
                      : node
                  )
                )
              }}
            />
            <SmartFormField
              label="节点描述"
              value={selectedNode.data.description || ''}
              type="string"
              onChange={(value) => {
                // 直接修改 AST 实例
                selectedNode.data.description = value;
                // 触发 React Flow 重新渲染
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === selectedNode.id
                      ? { ...node, data: node.data }
                      : node
                  )
                )
              }}
            />
            <div className="property-field">
              <label className="property-field-label text-xs font-medium text-slate-400 mb-1 block">
                节点颜色
              </label>
              <input
                type="color"
                value={selectedNode.data.color || '#3b82f6'}
                onChange={(e) => {
                  // 直接修改 AST 实例
                  selectedNode.data.color = e.target.value;
                  // 触发 React Flow 重新渲染
                  setNodes((nodes) =>
                    nodes.map((node) =>
                      node.id === selectedNode.id
                        ? { ...node, data: node.data }
                        : node
                    )
                  )
                }}
                className="w-full h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 输入属性 */}
        {editableProperties.length > 0 && (
          <div className="property-panel-section">
            <div className="flex items-center justify-between mb-3">
              <h4 className="property-panel-section-title text-sm font-semibold text-slate-300 flex items-center">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></div>
                输入参数
              </h4>

              {/* 保存状态指示器 */}
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                    <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse"></div>
                    保存中...
                  </div>
                )}
                {!isSaving && hasChanges && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400">
                    <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
                    未保存
                  </div>
                )}
                {!isSaving && !hasChanges && formData && Object.keys(formData).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                    已同步
                  </div>
                )}
              </div>
            </div>

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
