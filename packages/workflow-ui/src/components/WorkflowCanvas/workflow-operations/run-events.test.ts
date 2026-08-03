import { describe, it, expect, vi } from 'vitest'
import { applyWorkflowRunEvent } from './run-events'

/** 构造带原型标记的节点，便于验证原型链保持 */
function makeNode(id: string, patch: Record<string, any> = {}) {
  return Object.assign(
    Object.create({ isMockPrototype: true }),
    { id, type: 'TestNode', state: 'pending', progress: undefined, delta: undefined, accumulated: undefined },
    patch
  )
}

function makeWorkflow(initialNodes: any[], syncFromAst = vi.fn()) {
  return {
    workflowAst: { nodes: initialNodes },
    syncFromAst,
  } as any
}

describe('applyWorkflowRunEvent', () => {
  it('node_success 将目标节点置为 success', () => {
    const sync = vi.fn()
    const workflow = makeWorkflow([makeNode('n1'), makeNode('n2')], sync)
    applyWorkflowRunEvent(workflow, { type: 'node_success', id: 'n1' })

    expect(workflow.workflowAst.nodes[0].state).toBe('success')
    expect(workflow.workflowAst.nodes[1].state).toBe('pending')
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('node_fail 将目标节点置为 fail 并携带错误', () => {
    const workflow = makeWorkflow([makeNode('n1')])
    applyWorkflowRunEvent(workflow, { type: 'node_fail', id: 'n1', error: { message: 'boom' } })

    expect(workflow.workflowAst.nodes[0].state).toBe('fail')
    expect(workflow.workflowAst.nodes[0].error).toEqual({ message: 'boom' })
  })

  it('node_runing 将目标节点置为 running', () => {
    const workflow = makeWorkflow([makeNode('n1')])
    applyWorkflowRunEvent(workflow, { type: 'node_runing', id: 'n1' })

    expect(workflow.workflowAst.nodes[0].state).toBe('running')
  })

  it('node_emit 将 event.data 合并到目标节点', () => {
    const workflow = makeWorkflow([makeNode('n1')])
    applyWorkflowRunEvent(workflow, { type: 'node_emit', id: 'n1', data: { qrcode: 'abc' } })

    expect(workflow.workflowAst.nodes[0].qrcode).toBe('abc')
  })

  it('node_emit 未找到节点时告警但不崩溃', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const workflow = makeWorkflow([makeNode('n1')])
    applyWorkflowRunEvent(workflow, { type: 'node_emit', id: 'missing', data: { qrcode: 'abc' } })

    expect(warn).toHaveBeenCalled()
    expect(workflow.workflowAst.nodes[0].qrcode).toBeUndefined()
    warn.mockRestore()
  })

  it('node_progress 更新进度并保持 running 状态', () => {
    const workflow = makeWorkflow([makeNode('n1', { state: 'running' })])
    applyWorkflowRunEvent(workflow, { type: 'node_progress', id: 'n1', data: 0.5 })

    expect(workflow.workflowAst.nodes[0].progress).toBe(0.5)
    expect(workflow.workflowAst.nodes[0].state).toBe('running')
  })

  it('node_delta 累积流式数据并保持 running 状态', () => {
    const workflow = makeWorkflow([makeNode('n1', { state: 'running' })])
    applyWorkflowRunEvent(workflow, { type: 'node_delta', id: 'n1', data: { delta: 'x', accumulated: 'abc' } })

    expect(workflow.workflowAst.nodes[0].delta).toBe('x')
    expect(workflow.workflowAst.nodes[0].accumulated).toBe('abc')
    expect(workflow.workflowAst.nodes[0].state).toBe('running')
  })

  it('保持节点原型链不被破坏', () => {
    const workflow = makeWorkflow([makeNode('n1')])
    applyWorkflowRunEvent(workflow, { type: 'node_success', id: 'n1' })

    expect(Object.getPrototypeOf(workflow.workflowAst.nodes[0])).toHaveProperty('isMockPrototype', true)
  })
})
