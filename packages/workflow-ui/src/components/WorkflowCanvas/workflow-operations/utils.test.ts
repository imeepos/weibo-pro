import { describe, it, expect, vi } from 'vitest'
import type { INode, WorkflowGraphAst } from '@sker/workflow'
import {
  extractErrorInfo,
  extractDeepestError,
  collectPropertyUpdates,
  mergeNodeState,
  trackNodeExecution,
  resetConnectedInputs,
} from './utils'

/** 构造一个带原型标记的 mock 节点，便于验证原型链保持 */
function createMockNode(overrides: Partial<any> = {}): INode {
  return Object.assign(
    Object.create({ isMockPrototype: true }),
    {
      id: 'n1',
      type: 'TestNode',
      state: 'pending',
      count: 0,
      emitCount: 0,
      metadata: {
        inputs: [{ property: 'inputA' }],
        outputs: [{ property: 'outputB' }],
      },
      inputA: 'orig-input',
      outputB: 'orig-output',
    },
    overrides
  ) as INode
}

describe('extractDeepestError', () => {
  it('返回 null 当无错误', () => {
    expect(extractDeepestError(null)).toBeNull()
  })

  it('无 cause 时返回自身', () => {
    const error = { message: 'a' }
    expect(extractDeepestError(error)).toBe(error)
  })

  it('递归遍历 cause 链，返回最深层错误', () => {
    const error = { message: 'a', cause: { message: 'b', cause: { message: 'c' } } }
    expect(extractDeepestError(error)).toEqual({ message: 'c' })
  })
})

describe('extractErrorInfo', () => {
  it('空值返回未知错误', () => {
    expect(extractErrorInfo(null)).toEqual({ message: '未知错误' })
    expect(extractErrorInfo(undefined)).toEqual({ message: '未知错误' })
  })

  it('字符串错误原样返回', () => {
    expect(extractErrorInfo('boom')).toEqual({ message: 'boom' })
  })

  it('非对象非字符串错误转换为字符串', () => {
    expect(extractErrorInfo(123)).toEqual({ message: '123' })
  })

  it('Error 对象提取 message', () => {
    expect(extractErrorInfo(new Error('fail'))).toEqual({ message: 'fail' })
  })

  it('保留错误 type 字段', () => {
    expect(extractErrorInfo({ message: 'oops', type: 'X' })).toEqual({ message: 'oops', type: 'X' })
  })

  it('登录态错误映射为 LOGIN_EXPIRED', () => {
    expect(extractErrorInfo({ message: '请先登录', type: 'AUTH' })).toEqual({
      message: '登录态已过期，需要更换账号',
      type: 'LOGIN_EXPIRED',
    })
  })

  it('提取 cause 链上的最深 message', () => {
    expect(extractErrorInfo({ message: 'outer', cause: { message: 'inner' } })).toEqual({
      message: 'inner',
    })
  })

  it('无 message 的对象回退为 String(error)', () => {
    expect(extractErrorInfo({})).toEqual({ message: '[object Object]' })
  })
})

describe('collectPropertyUpdates', () => {
  it('收集 source 中存在的属性更新', () => {
    expect(
      collectPropertyUpdates([{ property: 'a' }, { property: 'b' }], { a: 1, b: 2, c: 3 })
    ).toEqual({ a: 1, b: 2 })
  })

  it('metadata 为空时返回空对象', () => {
    expect(collectPropertyUpdates(undefined, { a: 1 })).toEqual({})
  })

  it('source 中不存在的属性被跳过', () => {
    expect(collectPropertyUpdates([{ property: 'a' }], { b: 1 })).toEqual({})
  })
})

describe('mergeNodeState', () => {
  it('合并运行状态并保留原型链', () => {
    const original = createMockNode()
    const merged = mergeNodeState(original, {
      state: 'success',
      count: 5,
      emitCount: 2,
      inputA: 'new-input',
      outputB: 'new-output',
    })

    expect(merged.state).toBe('success')
    expect(merged.count).toBe(5)
    expect(merged.emitCount).toBe(2)
    expect((merged as any).inputA).toBe('new-input')
    expect((merged as any).outputB).toBe('new-output')
    expect(Object.getPrototypeOf(merged)).toHaveProperty('isMockPrototype', true)
  })

  it('不修改原始节点对象', () => {
    const original = createMockNode()
    mergeNodeState(original, { state: 'success', inputA: 'new-input' })

    expect(original.state).toBe('pending')
    expect((original as any).inputA).toBe('orig-input')
  })

  it('覆盖 error 字段', () => {
    const original = createMockNode()
    const merged = mergeNodeState(original, { state: 'fail', error: { message: 'boom' } })
    expect(merged.state).toBe('fail')
    expect(merged.error).toEqual({ message: 'boom' })
  })
})

describe('trackNodeExecution', () => {
  it('running 开始记录，success 完成记录并携带输出', () => {
    const recordIds = { current: new Map<string, string>() }
    const started = vi.fn(() => 'record-1')
    const completed = vi.fn()

    const node = createMockNode()
    trackNodeExecution(node, { id: 'n1', state: 'running' }, recordIds as any, started, completed)

    expect(started).toHaveBeenCalledWith('n1')
    expect(recordIds.current.get('n1')).toBe('record-1')
    expect(completed).not.toHaveBeenCalled()

    trackNodeExecution(
      node,
      { id: 'n1', state: 'success', outputB: 'out' },
      recordIds as any,
      started,
      completed
    )

    expect(completed).toHaveBeenCalledWith('n1', 'record-1', 'success', undefined, { outputB: 'out' })
    expect(recordIds.current.has('n1')).toBe(false)
  })

  it('fail 状态完成记录并携带错误信息', () => {
    const recordIds = { current: new Map<string, string>() }
    const started = vi.fn(() => 'record-1')
    const completed = vi.fn()

    const node = createMockNode()
    trackNodeExecution(node, { id: 'n1', state: 'running' }, recordIds as any, started, completed)
    trackNodeExecution(
      node,
      { id: 'n1', state: 'fail', error: { message: 'boom' } },
      recordIds as any,
      started,
      completed
    )

    expect(completed).toHaveBeenCalledWith('n1', 'record-1', 'fail', { message: 'boom' }, undefined)
  })

  it('未记录 start 时 success 不会调用 complete', () => {
    const recordIds = { current: new Map<string, string>() }
    const started = vi.fn(() => 'record-1')
    const completed = vi.fn()

    trackNodeExecution(createMockNode(), { id: 'n1', state: 'success' }, recordIds as any, started, completed)
    expect(completed).not.toHaveBeenCalled()
  })
})

describe('resetConnectedInputs', () => {
  it('重置有入边连接的输入属性为 defaultValue', () => {
    const ast = {
      nodes: [
        { id: 'n1', type: 'A', metadata: { inputs: [] } },
        {
          id: 'n2',
          type: 'B',
          metadata: { inputs: [{ property: 'inputA', defaultValue: 'def' }, { property: 'inputB' }] },
          inputA: 'old',
          inputB: 'keep',
        },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2', toProperty: 'inputA' }],
    } as unknown as WorkflowGraphAst

    resetConnectedInputs(ast)

    expect((ast.nodes[1] as any).inputA).toBe('def')
    expect((ast.nodes[1] as any).inputB).toBe('keep')
  })

  it('无 defaultValue 时数组重置为空数组', () => {
    const ast = {
      nodes: [
        { id: 'n1', type: 'A', metadata: { inputs: [] } },
        {
          id: 'n2',
          type: 'B',
          metadata: { inputs: [{ property: 'inputA' }] },
          inputA: [1, 2],
        },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2', toProperty: 'inputA' }],
    } as unknown as WorkflowGraphAst

    resetConnectedInputs(ast)

    expect((ast.nodes[1] as any).inputA).toEqual([])
  })

  it('deep clone 默认值避免引用污染', () => {
    const defaultValue = { a: 1 }
    const ast = {
      nodes: [
        { id: 'n1', type: 'A', metadata: { inputs: [] } },
        {
          id: 'n2',
          type: 'B',
          metadata: { inputs: [{ property: 'inputA', defaultValue }] },
          inputA: 'old',
        },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2', toProperty: 'inputA' }],
    } as unknown as WorkflowGraphAst

    resetConnectedInputs(ast)

    expect((ast.nodes[1] as any).inputA).toEqual({ a: 1 })
    expect((ast.nodes[1] as any).inputA).not.toBe(defaultValue)
  })

  it('无入边连接的输入属性不被重置', () => {
    const ast = {
      nodes: [
        { id: 'n1', type: 'A', metadata: { inputs: [] } },
        {
          id: 'n2',
          type: 'B',
          metadata: { inputs: [{ property: 'inputA', defaultValue: 'def' }] },
          inputA: 'manual',
        },
      ],
      edges: [],
    } as unknown as WorkflowGraphAst

    resetConnectedInputs(ast)

    expect((ast.nodes[1] as any).inputA).toBe('manual')
  })
})
