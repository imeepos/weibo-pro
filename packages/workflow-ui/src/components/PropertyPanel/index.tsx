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

  const [formData, setFormData] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const formChange$ = useRef(new Subject<FormChangeEvent>())

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

  useEffect(() => {
    const subscription = formChange$.current
      .pipe(
        debounceTime(600),
        distinctUntilChanged((prev, curr) =>
          JSON.stringify(prev.formData) === JSON.stringify(curr.formData)
        )
      )
      .subscribe((event) => {
        if (!selectedNode || selectedNode.id !== event.nodeId) return

        setIsSaving(true)

        const ast = selectedNode.data
        Object.entries(event.formData).forEach(([property, value]) => {
          ;(ast as any)[property] = value
        })

        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === selectedNode.id
              ? { ...node, data: { ...node.data } }
              : node
          )
        )

        setTimeout(() => {
          setIsSaving(false)
          setHasChanges(false)
        }, 200)
      })

    return () => subscription.unsubscribe()
  }, [selectedNode, setNodes])

  if (!selectedNode) {
    return (
      <div className={`flex flex-col h-full border-l bg-card border-border ${className}`}>
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <div className="text-muted mb-4">
            <svg className="h-12 w-12 mx-auto opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.037-.502.068-.75.097h-1.5c-.249-.03-.5-.06-.75-.097L4.5 3.104M14.25 3.104v5.714c0 .828.312 1.591.878 2.121l4.5 4.5M14.25 3.104c.251.037.502.068.75.097h1.5c.249-.03.5-.06.75-.097l2.25-2.403M12 18.75a6 6 0 00-6-6H4.5a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6v-.75zm6-12a6 6 0 00-6-6h-.75a6 6 0 00-6 6v.75a6 6 0 006 6h.75a6 6 0 006-6V6.75z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">未选中节点</p>
          <p className="text-xs text-muted mt-2">点击画布中的节点查看详细属性</p>
        </div>
      </div>
    )
  }

  const metadata = getNodeMetadata(resolveConstructor(selectedNode.data))
  const ast = selectedNode.data

  const handlePropertyChange = (property: string, value: any) => {
    const newFormData = {
      ...formData,
      [property]: value,
    }

    setFormData(newFormData)
    setHasChanges(true)

    formChange$.current.next({
      nodeId: selectedNode.id,
      formData: newFormData,
    })
  }

  const editableProperties = metadata.inputs.map((input) => ({
    ...input,
    value: formData[input.property] ?? (ast as any)[input.property],
  }))

  const readonlyProperties = metadata.outputs.map((output) => ({
    ...output,
    value: (ast as any)[output.property],
  }))

  return (
    <div className={`flex flex-col h-full border-l bg-card border-border ${className}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 节点基础信息 */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
            基础信息
          </h4>
          <div className="space-y-3">
            <SmartFormField
              label="节点名称"
              value={selectedNode.data.name || metadata.title}
              type="string"
              onChange={(value) => {
                selectedNode.data.name = value;
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
                selectedNode.data.description = value;
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === selectedNode.id
                      ? { ...node, data: node.data }
                      : node
                  )
                )
              }}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                节点颜色
              </label>
              <input
                type="color"
                value={selectedNode.data.color || '#3b82f6'}
                onChange={(e) => {
                  selectedNode.data.color = e.target.value;
                  setNodes((nodes) =>
                    nodes.map((node) =>
                      node.id === selectedNode.id
                        ? { ...node, data: node.data }
                        : node
                    )
                  )
                }}
                className="w-full h-10 rounded-lg border border-border bg-card cursor-pointer"
              />
            </div>
          </div>
        </section>

        {/* 输入属性 */}
        {editableProperties.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                输入参数
              </h4>

              {/* 保存状态指示器 */}
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                    保存中...
                  </div>
                )}
                {!isSaving && hasChanges && (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-500">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                    未保存
                  </div>
                )}
                {!isSaving && !hasChanges && formData && Object.keys(formData).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-green-500">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
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
          </section>
        )}

        {/* 输出属性 */}
        {readonlyProperties.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
              输出结果
            </h4>
            <div className="space-y-3">
              {readonlyProperties.map((prop) => (
                <div key={prop.property} className="space-y-1.5 opacity-70">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {prop.label || prop.property}
                  </label>
                  <div className="text-xs text-slate-300 font-mono bg-card/50 px-3 py-2 rounded-lg border border-border/50 break-all">
                    {JSON.stringify(prop.value)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 节点信息 */}
        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center">
            <div className="w-1.5 h-1.5 bg-secondary rounded-full mr-2"></div>
            节点信息
          </h4>
          <div className="space-y-3">
            <div className="space-y-1.5 opacity-70">
              <label className="block text-xs font-medium text-slate-400 mb-1">节点ID</label>
              <div className="text-xs text-slate-300 font-mono bg-card/50 px-3 py-2 rounded-lg border border-border/50">
                {selectedNode.id}
              </div>
            </div>
            <div className="space-y-1.5 opacity-70">
              <label className="block text-xs font-medium text-slate-400 mb-1">运行状态</label>
              <div className="text-xs capitalize bg-card/50 px-3 py-2 rounded-lg border border-border/50">
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
              <div className="space-y-1.5 opacity-70">
                <label className="block text-xs font-medium text-slate-400 mb-1">错误信息</label>
                <div className="bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/30">
                  <ErrorDetailPanel error={selectedNode.data.error as SerializedError} />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
