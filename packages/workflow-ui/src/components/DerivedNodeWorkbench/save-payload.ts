import type { CreateDerivedNodePayload } from '@sker/sdk'
import type { INode, INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'

export interface DerivedNodeWorkbenchSaveDraft {
  baseNode: Pick<INode, 'type' | 'metadata'> | null
  frozenInputs: Record<string, unknown>
  exposedInputs: INodeInputMetadata[]
  customOutputs: INodeOutputMetadata[]
  nodeMetadata: {
    name: string
    title: string
    type: string
    description: string
  }
}

const normalizeText = (value: string) => value.trim()

export function getDerivedNodeSaveValidationError(
  draft: DerivedNodeWorkbenchSaveDraft
): string | null {
  if (!draft.baseNode) {
    return '请先选择元节点'
  }

  const { name, title, type } = draft.nodeMetadata
  if (!normalizeText(name) || !normalizeText(title) || !normalizeText(type)) {
    return '请补全节点名称、标题和类型'
  }

  return null
}

export function buildDerivedNodeCreatePayload(
  draft: DerivedNodeWorkbenchSaveDraft
): CreateDerivedNodePayload | null {
  if (!draft.baseNode) {
    return null
  }

  const name = normalizeText(draft.nodeMetadata.name)
  const title = normalizeText(draft.nodeMetadata.title)
  const type = normalizeText(draft.nodeMetadata.type)
  const description = normalizeText(draft.nodeMetadata.description)

  return {
    name,
    baseType: draft.baseNode.type,
    frozenInputs: draft.frozenInputs,
    nodeMetadata: {
      class: {
        title,
        type,
        description: description || undefined,
      },
      inputs: draft.exposedInputs.map((input) => ({
        property: input.property,
        title: input.title || input.property,
        type: input.type,
        defaultValue: input.defaultValue,
      })),
      outputs: [
        ...((draft.baseNode.metadata?.outputs || []).map((output) => ({
          property: output.property,
          title: output.title || output.property,
          type: output.type,
        }))),
        ...draft.customOutputs.map((output) => ({
          property: output.property,
          title: output.title || output.property,
          type: output.type,
        })),
      ],
    },
  }
}
