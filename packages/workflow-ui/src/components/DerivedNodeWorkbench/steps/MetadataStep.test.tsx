import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { useDerivedNodeWorkbench } from '../../../store/derived-node-workbench.store'
import { MetadataStep } from './MetadataStep'

const store = useDerivedNodeWorkbench as any
const initialState = store.getState()

describe('MetadataStep', () => {
  beforeEach(() => {
    act(() => {
      store.setState({
        ...initialState,
        baseNode: {
          id: 'base-1',
          type: 'meta-node',
          state: 'idle',
          count: 0,
          emitCount: 0,
          metadata: {
            class: { title: '元节点', type: 'meta-node' },
            inputs: [],
            outputs: [
              { property: 'origin', title: '原始输出', type: 'string' },
            ],
          },
        },
        frozenInputs: { fixed: 'value' },
        exposedInputs: [],
        customOutputs: [
          { property: 'extra', title: '附加输出', type: 'number' },
        ],
        nodeMetadata: {
          name: ' derived_meta ',
          title: ' 派生节点 ',
          type: ' derived_meta ',
          description: '',
        },
      })
    })
  })

  afterEach(() => {
    act(() => {
      store.setState(initialState)
    })
  })

  it('renders the mapped create payload instead of the raw draft payload', () => {
    const { container } = render(<MetadataStep />)
    const savePanel = container.querySelectorAll('pre')[1]

    expect(savePanel?.textContent).toContain('"baseType": "meta-node"')
    expect(savePanel?.textContent).toContain('"origin"')
    expect(savePanel?.textContent).toContain('"extra"')
    expect(savePanel?.textContent).not.toContain('"baseNodeType"')
  })
})
