import type { WritableDraft } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { INode, INodeInputMetadata, INodeOutputMetadata } from '@sker/workflow'

interface NodeMetadata {
  name: string
  title: string
  type: string
  description: string
}

interface DerivedNodeWorkbenchState {
  baseNode: INode | null
  frozenInputs: Record<string, unknown>
  exposedInputs: INodeInputMetadata[]
  customOutputs: INodeOutputMetadata[]
  nodeMetadata: NodeMetadata
  currentStep: 1 | 2 | 3 | 4

  selectBaseNode: (node: INode) => void
  setFrozenInput: (property: string, value: unknown) => void
  toggleInputExposed: (property: string, exposed: boolean) => void
  addCustomOutput: (output: INodeOutputMetadata) => void
  removeCustomOutput: (property: string) => void
  updateMetadata: (metadata: Partial<NodeMetadata>) => void
  setStep: (step: 1 | 2 | 3 | 4) => void
  reset: () => void
  getPreviewMetadata: () => any
  toSavePayload: () => any
}

const initialMetadata: NodeMetadata = {
  name: '',
  title: '',
  type: 'derived',
  description: ''
}

export const useDerivedNodeWorkbench: {
  (): DerivedNodeWorkbenchState
  <T>(selector: (state: DerivedNodeWorkbenchState) => T): T
} = create<DerivedNodeWorkbenchState>()(
  immer((set, get) => ({
    baseNode: null,
    frozenInputs: {},
    exposedInputs: [],
    customOutputs: [],
    nodeMetadata: initialMetadata,
    currentStep: 1,

    selectBaseNode: (node) => {
      set((draft) => {
        draft.baseNode = node
        draft.frozenInputs = {}
        draft.exposedInputs = node.metadata?.inputs || []
        draft.customOutputs = []
        draft.nodeMetadata = {
          ...initialMetadata,
          name: `derived_${node.type}`,
          title: `派生${node.metadata?.class?.title || node.type}`
        }
      })
    },

    setFrozenInput: (property, value) => {
      set((draft) => {
        draft.frozenInputs[property] = value
      })
    },

    toggleInputExposed: (property, exposed) => {
      set((draft) => {
        const input = draft.baseNode?.metadata?.inputs.find(i => i.property === property)
        if (!input) return

        if (exposed) {
          if (!draft.exposedInputs.find(i => i.property === property)) {
            draft.exposedInputs.push(input)
          }
        } else {
          draft.exposedInputs = draft.exposedInputs.filter(i => i.property !== property)
        }
      })
    },

    addCustomOutput: (output) => {
      set((draft) => {
        draft.customOutputs.push(output)
      })
    },

    removeCustomOutput: (property) => {
      set((draft) => {
        draft.customOutputs = draft.customOutputs.filter(o => o.property !== property)
      })
    },

    updateMetadata: (metadata) => {
      set((draft) => {
        draft.nodeMetadata = { ...draft.nodeMetadata, ...metadata }
      })
    },

    setStep: (step) => {
      set((draft) => {
        draft.currentStep = step
      })
    },

    reset: () => {
      set((draft) => {
        draft.baseNode = null
        draft.frozenInputs = {}
        draft.exposedInputs = []
        draft.customOutputs = []
        draft.nodeMetadata = initialMetadata
        draft.currentStep = 1
      })
    },

    getPreviewMetadata: () => {
      const { baseNode, frozenInputs, exposedInputs, customOutputs, nodeMetadata } = get()
      if (!baseNode) return null

      return {
        ...baseNode,
        ...nodeMetadata,
        metadata: {
          ...baseNode.metadata,
          inputs: exposedInputs,
          outputs: [...(baseNode.metadata?.outputs || []), ...customOutputs]
        },
        frozenInputs
      }
    },

    toSavePayload: () => {
      const { baseNode, frozenInputs, exposedInputs, customOutputs, nodeMetadata } = get()
      if (!baseNode) return null

      return {
        baseNodeType: baseNode.type,
        frozenInputs,
        exposedInputs: exposedInputs.map(i => i.property),
        customOutputs,
        metadata: nodeMetadata
      }
    }
  }))
)
