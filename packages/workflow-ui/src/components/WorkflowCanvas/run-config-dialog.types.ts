import type { ReactNode } from 'react'
import type { WorkflowGraphAst } from '@sker/workflow'
import type { InputFieldType } from '@sker/ui/components/workflow/workflow-form-field'

/**
 * 运行配置对话框 Props
 */
export interface RunConfigDialogProps {
  visible: boolean
  workflow: WorkflowGraphAst
  defaultInputs?: Record<string, unknown>
  onConfirm: (inputs: Record<string, unknown>) => void
  onCancel: () => void
}

/**
 * 单个 @Input 字段
 */
export interface InputField {
  nodeId: string
  nodeName: string
  propertyKey: string
  propertyLabel: string
  type: InputFieldType
  value: any
  fullKey: string
}

/**
 * 节点 @Setting 渲染器签名
 */
export interface NodeSettingRenderer {
  (ast: any, onPropertyChange: (property: string, value: any) => void): ReactNode
}
