import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDerivedNodeWorkbench } from '../../store/derived-node-workbench.store'

const saveDerivedNode = vi.fn()
const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('./MetaNodePicker', () => ({
  MetaNodePicker: () => <div>MetaNodePicker</div>,
}))

vi.mock('./ConfigEditor', () => ({
  ConfigEditor: () => <div>ConfigEditor</div>,
}))

vi.mock('./NodePreview', () => ({
  NodePreview: () => <div>NodePreview</div>,
}))

vi.mock('../../services/derived-node.api', () => ({
  saveDerivedNode: (...args: any[]) => saveDerivedNode(...args),
}))

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="derived-node-toaster" />,
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}))

import { DerivedNodeWorkbench } from './index'

const store = useDerivedNodeWorkbench as any
const initialState = store.getState()

const readyState = {
  ...initialState,
  baseNode: {
    id: 'base-1',
    type: 'meta-node',
    state: 'idle',
    count: 0,
    emitCount: 0,
    metadata: {
      class: { title: '元节点', type: 'meta-node' },
      inputs: [
        {
          property: 'keyword',
          title: '关键词',
          type: 'string',
          defaultValue: 'AI',
        },
      ],
      outputs: [
        {
          property: 'origin',
          title: '原始输出',
          type: 'string',
        },
      ],
    },
  },
  frozenInputs: {
    fixed: 'value',
  },
  exposedInputs: [
    {
      property: 'keyword',
      title: '关键词',
      type: 'string',
      defaultValue: 'AI',
    },
  ],
  customOutputs: [
    {
      property: 'score',
      title: '评分',
      type: 'number',
    },
  ],
  nodeMetadata: {
    name: 'derived_meta',
    title: '派生节点',
    type: 'derived_meta',
    description: '用于测试',
  },
}

describe('DerivedNodeWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      store.setState(readyState)
    })
  })

  afterEach(() => {
    act(() => {
      store.setState(initialState)
    })
  })

  it('calls saveDerivedNode with the mapped payload and shows success feedback', async () => {
    saveDerivedNode.mockResolvedValue({ id: 'derived-1' })

    render(<DerivedNodeWorkbench />)
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(saveDerivedNode).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'derived_meta',
          baseType: 'meta-node',
          nodeMetadata: expect.objectContaining({
            outputs: expect.arrayContaining([
              expect.objectContaining({ property: 'origin' }),
              expect.objectContaining({ property: 'score' }),
            ]),
          }),
        })
      )
    })

    expect(toastSuccess).toHaveBeenCalledWith('保存成功')
  })

  it('disables the save button while the request is pending', async () => {
    let resolveSave!: (value: unknown) => void
    saveDerivedNode.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve
      })
    )

    render(<DerivedNodeWorkbench />)
    const saveButton = screen.getByText('保存') as HTMLButtonElement

    fireEvent.click(saveButton)
    expect(saveButton.disabled).toBe(true)

    resolveSave({ id: 'derived-1' })

    await waitFor(() => {
      expect(saveButton.disabled).toBe(false)
    })
  })

  it('shows backend error details when save fails', async () => {
    saveDerivedNode.mockRejectedValue(new Error('节点名称已存在'))

    render(<DerivedNodeWorkbench />)
    fireEvent.click(screen.getByText('保存'))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('保存失败：节点名称已存在')
    })
  })

  it('blocks save when required metadata is blank', () => {
    act(() => {
      store.setState({
        ...readyState,
        nodeMetadata: {
          ...readyState.nodeMetadata,
          title: '   ',
        },
      })
    })

    render(<DerivedNodeWorkbench />)
    fireEvent.click(screen.getByText('保存'))

    expect(saveDerivedNode).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('请补全节点名称、标题和类型')
  })
})
