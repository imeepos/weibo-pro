/**
 * TDD 测试: useRunConfigDialog 自定义 hook
 *
 * 覆盖: 打开时收集输入、handleInputChange、getPropChangeWrapper、resetState
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRunConfigDialog } from './useRunConfigDialog'

vi.mock('@sker/workflow', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    resolveConstructor: vi.fn(),
    getInputMetadata: vi.fn(),
  }
})

import { getInputMetadata, resolveConstructor } from '@sker/workflow'

const mockResolveConstructor = resolveConstructor as unknown as ReturnType<typeof vi.fn>
const mockGetInputMetadata = getInputMetadata as unknown as ReturnType<typeof vi.fn>

const EMPTY_WORKFLOW = { nodes: [], edges: [] }

beforeEach(() => {
  mockResolveConstructor.mockReset()
  mockGetInputMetadata.mockReset()
})

describe('useRunConfigDialog', () => {
  it('初始状态为空', () => {
    const { result } = renderHook(() =>
      useRunConfigDialog(EMPTY_WORKFLOW as any, {}, false)
    )

    expect(result.current.inputs).toEqual({})
    expect(result.current.inputFields).toEqual([])
    expect(result.current.settingRenderers.size).toBe(0)
  })

  it('打开时从工作流收集最新输入值', () => {
    const ctor = class MockNode {}
    mockResolveConstructor.mockReturnValue(ctor)
    mockGetInputMetadata.mockReturnValue([{ propertyKey: 'keyword', defaultValue: '默认词' }])

    const workflow = { nodes: [{ id: 'n1' }], edges: [] }
    const { result, rerender } = renderHook(
      ({ visible }) => useRunConfigDialog(workflow as any, {}, visible),
      { initialProps: { visible: false } }
    )

    expect(result.current.inputs).toEqual({})

    act(() => {
      rerender({ visible: true })
    })

    expect(result.current.inputs).toEqual({ 'n1.keyword': '默认词' })
    expect(result.current.inputFields).toEqual([
      {
        nodeId: 'n1',
        nodeName: '未命名节点',
        propertyKey: 'keyword',
        propertyLabel: '关键词',
        type: 'string',
        value: '默认词',
        fullKey: 'n1.keyword',
      },
    ])
  })

  it('打开时优先使用 defaultInputs 完整格式', () => {
    const ctor = class MockNode {}
    mockResolveConstructor.mockReturnValue(ctor)
    mockGetInputMetadata.mockReturnValue([{ propertyKey: 'keyword', defaultValue: '默认词' }])

    const workflow = { nodes: [{ id: 'n1' }], edges: [] }
    const defaultInputs = { 'n1.keyword': '外部输入' }
    const { result, rerender } = renderHook(
      ({ visible }) => useRunConfigDialog(workflow as any, defaultInputs, visible),
      { initialProps: { visible: false } }
    )

    act(() => {
      rerender({ visible: true })
    })

    expect(result.current.inputs).toEqual({ 'n1.keyword': '外部输入' })
  })

  it('handleInputChange 更新单个字段', () => {
    const { result } = renderHook(() =>
      useRunConfigDialog(EMPTY_WORKFLOW as any, {}, true)
    )

    act(() => {
      result.current.handleInputChange('n1.keyword', '新值')
    })

    expect(result.current.inputs).toEqual({ 'n1.keyword': '新值' })
  })

  it('getPropChangeWrapper 更新节点值并同步 inputs', () => {
    const node = { id: 'n1', keyword: '旧值' }
    const { result } = renderHook(() =>
      useRunConfigDialog(EMPTY_WORKFLOW as any, {}, true)
    )

    let wrapper: (prop: string, value: any) => void
    act(() => {
      wrapper = result.current.getPropChangeWrapper('n1', node)
    })

    act(() => {
      wrapper!('keyword', '新值')
    })

    expect((node as any).keyword).toBe('新值')
    expect(result.current.inputs).toEqual({ 'n1.keyword': '新值' })
  })

  it('resetState 清空输入状态', () => {
    const { result } = renderHook(() =>
      useRunConfigDialog(EMPTY_WORKFLOW as any, {}, true)
    )

    act(() => {
      result.current.handleInputChange('n1.keyword', '新值')
    })
    expect(result.current.inputs).toEqual({ 'n1.keyword': '新值' })

    act(() => {
      result.current.resetState()
    })
    expect(result.current.inputs).toEqual({})
  })

  it('节点带自定义名称与类型时字段使用节点名称', () => {
    const ctor = class MockNode {}
    mockResolveConstructor.mockReturnValue(ctor)
    mockGetInputMetadata.mockReturnValue([
      { propertyKey: 'keyword', defaultValue: '词', title: '关键词字段' },
    ])

    const workflow = { nodes: [{ id: 'n1', name: '我的节点', type: 'SearchNode' }], edges: [] }
    const { result, rerender } = renderHook(
      ({ visible }) => useRunConfigDialog(workflow as any, {}, visible),
      { initialProps: { visible: false } }
    )

    act(() => {
      rerender({ visible: true })
    })

    const field = result.current.inputFields[0]
    expect(field.nodeName).toBe('我的节点')
    expect(field.propertyLabel).toBe('关键词字段')
  })
})
