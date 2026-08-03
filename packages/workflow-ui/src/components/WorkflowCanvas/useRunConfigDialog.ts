import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getInputMetadata, resolveConstructor, SETTING_METHOD } from '@sker/workflow'
import type { WorkflowGraphAst } from '@sker/workflow'
import { root } from '@sker/core'
import type { InputFieldType } from '@sker/ui/components/workflow/workflow-form-field'
import type { InputField, NodeSettingRenderer } from './run-config-dialog.types'
import {
  collectInputsFromWorkflow,
  findEntryNodes,
  formatLabel,
  inferFieldType,
} from './run-config-dialog.utils'

export interface UseRunConfigDialogReturn {
  inputs: Record<string, unknown>
  inputNodes: any[]
  inputFields: InputField[]
  settingRenderers: Map<string, NodeSettingRenderer>
  handleInputChange: (fullKey: string, value: any) => void
  getPropChangeWrapper: (nodeId: string, node: any) => (prop: string, value: any) => void
  resetState: () => void
}

/**
 * 运行配置对话框核心逻辑 Hook
 *
 * 职责：
 * - 每次打开时从工作流 AST 收集最新输入值
 * - 识别入口节点（优先 entryNodeIds，回退到无入边节点）
 * - 解析 @Setting 渲染器（复用 PropertyPanel 逻辑）
 * - 提取带 @Input 装饰器的字段
 * - 提供稳定回调（handleInputChange / getPropChangeWrapper / resetState）
 */
export function useRunConfigDialog(
  workflow: WorkflowGraphAst,
  defaultInputs: Record<string, unknown>,
  visible: boolean
): UseRunConfigDialogReturn {
  const [inputs, setInputs] = useState<Record<string, unknown>>({})
  const [_isInitialized, setIsInitialized] = useState(false)
  const dialogVisibleRef = useRef(false)

  // 每次打开对话框时，从工作流获取最新状态
  useEffect(() => {
    const isOpening = visible && !dialogVisibleRef.current

    if (!visible) {
      setIsInitialized(false)
      dialogVisibleRef.current = false
      return
    }

    if (!isOpening) {
      return
    }

    // 从当前工作流 AST 收集最新的输入值
    const latestInputs = collectInputsFromWorkflow(workflow, defaultInputs)
    setInputs(latestInputs)
    setIsInitialized(true)
    dialogVisibleRef.current = true
  }, [visible, workflow, defaultInputs])

  // 识别入口节点（优先使用 entryNodeIds，为空时回退到无入边节点）
  const inputNodes = useMemo(() => findEntryNodes(workflow), [workflow])

  // 获取节点的 @Setting 渲染器（复用 PropertyPanel 的逻辑）
  // 使用 ref 避免重新创建导致无限渲染
  const settingRenderersRef = useRef<Map<string, NodeSettingRenderer> | null>(null)
  const settingRenderers = useMemo(() => {
    if (!settingRenderersRef.current) {
      const renderers = new Map<string, NodeSettingRenderer>()

      inputNodes.forEach((node: any) => {
        try {
          const ctor = resolveConstructor(node)
          const settings = root.get(SETTING_METHOD, [])
          const setting = settings.find((s: any) => s.ast?.name === ctor?.name)
          if (setting) {
            const instance = root.get(setting.target)
            renderers.set(node.id, (ast: any, onPropertyChange: (prop: string, value: any) => void) => {
              // 使用稳定引用的回调，避免无限渲染
              return (instance as any)[setting.property].call(instance, ast, onPropertyChange)
            })
          }
        } catch (error) {
          console.error('[RunConfigDialog] 获取 @Setting 渲染器失败:', {
            nodeId: node.id,
            nodeType: node.type,
            error
          })
        }
      })

      settingRenderersRef.current = renderers
    }

    return settingRenderersRef.current
  }, [inputNodes])

  const handleInputChange = useCallback((fullKey: string, value: any) => {
    setInputs((prev) => ({
      ...prev,
      [fullKey]: value,
    }))
  }, [])

  // 为每个节点创建稳定的 propChangeWrapper，同时存储最新的 node 引用
  const nodeRefsRef = useRef<Map<string, any>>(new Map())
  const propChangeWrappersRef = useRef<Map<string, (prop: string, value: any) => void>>(new Map())
  const getPropChangeWrapper = useCallback((nodeId: string, node: any) => {
    // 更新 node 引用
    nodeRefsRef.current.set(nodeId, node)

    if (!propChangeWrappersRef.current.has(nodeId)) {
      propChangeWrappersRef.current.set(nodeId, (prop: string, value: any) => {
        // 从 ref 获取最新的 node 引用
        const currentNode = nodeRefsRef.current.get(nodeId)
        if (currentNode) {
          currentNode[prop] = value
        }
        // 强制触发重新渲染
        setInputs((prev) => ({ ...prev, [`${nodeId}.${prop}`]: value }))
      })
    }
    return propChangeWrappersRef.current.get(nodeId)!
  }, [])

  // 提取所有带 @Input 装饰器的字段
  const inputFields = useMemo(() => {
    const fields: InputField[] = []

    inputNodes.forEach((node: any) => {
      // 优雅的名称获取策略：
      // 1. 优先使用 node.name（用户自定义名称）
      // 2. 回退到 node.metadata.class.title（节点类型的中文名）
      // 3. 最后使用类型名称
      const nodeName = node.name || node.metadata?.class?.title || node.type || '未命名节点'

      try {
        // 获取节点构造函数
        const ctor = resolveConstructor(node)

        // 获取该节点类型的所有 @Input 元数据
        const inputMetadatas = getInputMetadata(ctor)
        const metadataArray = Array.isArray(inputMetadatas) ? inputMetadatas : [inputMetadatas]

        // 遍历所有 @Input 属性
        metadataArray.forEach((metadata) => {
          const propKey = String(metadata.propertyKey)
          const fullKey = `${node.id}.${propKey}`

          // 获取当前值（inputs 初始化时已包含节点当前值和默认值）
          const currentValue = inputs[fullKey]

          // 优先使用 @Input 装饰器指定的类型，否则智能推断
          const fieldType: InputFieldType = metadata.type || inferFieldType(propKey, currentValue)

          // 优先使用 @Input 装饰器指定的标题，否则格式化属性名
          const label = metadata.title || formatLabel(propKey)

          fields.push({
            nodeId: node.id,
            nodeName,
            propertyKey: propKey,
            propertyLabel: label,
            type: fieldType,
            value: currentValue,
            fullKey,
          })
        })
      } catch (error) {
        console.warn(`无法获取节点 ${nodeName} 的 @Input 元数据:`, error)
      }
    })

    return fields
  }, [inputNodes, inputs])

  const resetState = useCallback(() => {
    // 清空输入状态，避免下次打开时残留旧数据
    setInputs({})
    setIsInitialized(false)
    dialogVisibleRef.current = false
  }, [])

  return {
    inputs,
    inputNodes,
    inputFields,
    settingRenderers,
    handleInputChange,
    getPropChangeWrapper,
    resetState,
  }
}
