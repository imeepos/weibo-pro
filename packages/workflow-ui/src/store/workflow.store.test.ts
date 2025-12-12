import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from './workflow.store'
import { WorkflowGraphAst, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import { WorkflowEventBus, WorkflowEventType } from '@sker/workflow'
import { TextAreaAst } from '@sker/workflow'

/**
 * 单元测试：验证 workflow.store 监听 NODE_SUCCESS 事件并正确更新节点状态
 *
 * 场景：
 * 1. 初始化工作流（包含聚合节点，input 为空字符串）
 * 2. 模拟后端发射 NODE_SUCCESS 事件（payload 包含更新后的节点数据，input 为数组）
 * 3. 验证 store 中的节点数据是否正确更新
 */
describe('WorkflowStore - NODE_SUCCESS 事件监听', () => {
  let eventBus: WorkflowEventBus
  let compiler: Compiler

  beforeEach(() => {
    // 重置 store 状态
    useWorkflowStore.getState().clear()

    // 获取服务实例
    eventBus = root.get(WorkflowEventBus)
    compiler = root.get(Compiler)
  })

  it('应该监听 NODE_SUCCESS 事件并同步节点状态', async () => {
    const store = useWorkflowStore.getState()

    // 创建测试工作流
    const node1 = new TextAreaAst()
    node1.id = 'node1'
    node1.input = ['01']  // 入口节点静态输入

    const node2 = new TextAreaAst()
    node2.id = 'node2'
    node2.input = ''  // ❌ 初始为空字符串（旧数据格式）

    // 编译节点
    compiler.compile(node1)
    compiler.compile(node2)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'test-workflow'
    workflow.nodes = [node1, node2]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data'
      }
    ]

    compiler.compile(workflow)

    // 初始化工作流
    store.initWorkflow(workflow)

    // 验证初始状态（编译后 input 会被初始化为数组）
    const initialNode2 = store.workflowAst?.nodes.find(n => n.id === 'node2')
    console.log('[测试] 初始节点2:', {
      input: initialNode2?.input,
      inputType: Array.isArray(initialNode2?.input) ? 'array' : typeof initialNode2?.input
    })

    // 等待一小段时间，确保事件监听器已注册
    await new Promise(resolve => setTimeout(resolve, 10))

    // 模拟后端发射 NODE_SUCCESS 事件（payload 是完整的节点对象，input 已更新为数组）
    const updatedNode2 = {
      ...node2,
      state: 'success' as const,
      input: ['01', '02'],  // ✅ 执行后更新为数组
      count: 1,
      emitCount: 1
    }

    console.log('[测试] 发射 NODE_SUCCESS 事件, payload:', updatedNode2)

    eventBus.emitNodeSuccess('node2', updatedNode2, workflow.id)

    // 等待事件处理完成
    await new Promise(resolve => setTimeout(resolve, 50))

    // ✨ 重新获取最新状态（Zustand getState() 返回的是快照）
    const latestStore = useWorkflowStore.getState()
    const { workflowAst: finalWorkflow } = latestStore
    const finalNode2 = finalWorkflow?.nodes.find(n => n.id === 'node2')

    console.log('[测试] 更新后的 workflowAst:', {
      hasWorkflowAst: !!finalWorkflow,
      nodeCount: finalWorkflow?.nodes.length,
      nodeIds: finalWorkflow?.nodes.map(n => n.id)
    })

    console.log('[测试] 更新后的节点2:', {
      found: !!finalNode2,
      input: finalNode2?.input,
      inputType: Array.isArray(finalNode2?.input) ? 'array' : typeof finalNode2?.input,
      state: finalNode2?.state,
      count: finalNode2?.count
    })

    // 关键断言：input 应该是数组
    expect(finalNode2).toBeDefined()
    expect(Array.isArray(finalNode2?.input)).toBe(true)
    expect(finalNode2?.input).toEqual(['01', '02'])
    expect(finalNode2?.state).toBe('success')
    expect(finalNode2?.count).toBe(1)
  })

  it('应该在导出时包含执行后的节点状态', async () => {
    const store = useWorkflowStore.getState()

    // 创建测试工作流（模拟用户提供的场景）
    const node1 = new TextAreaAst()
    node1.id = "node1"
    node1.input = "01"

    const node2 = new TextAreaAst()
    node2.id = "node2"
    node2.input = ""  // ❌ 旧数据：空字符串

    // 编译节点
    compiler.compile(node1)
    compiler.compile(node2)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'demo-workflow'
    workflow.nodes = [node1, node2]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data'
      }
    ]

    compiler.compile(workflow)

    store.initWorkflow(workflow)

    await new Promise(resolve => setTimeout(resolve, 10))

    // 模拟节点1执行成功
    eventBus.emitNodeSuccess('node1', {
      ...node1,
      state: 'success',
      count: 1
    }, workflow.id)

    // 模拟节点2执行成功（input 已更新为数组）
    eventBus.emitNodeSuccess('node2', {
      ...node2,
      state: 'success',
      input: ['01'],  // ✅ 执行后更新
      count: 1
    }, workflow.id)

    await new Promise(resolve => setTimeout(resolve, 50))

    // 导出工作流
    const exported = store.toAst()

    console.log('[测试] 导出的工作流:', {
      workflowId: (exported as WorkflowGraphAst).id,
      nodes: exported.nodes.map(n => ({
        id: n.id,
        type: n.type,
        input: n.input,
        inputType: Array.isArray(n.input) ? 'array' : typeof n.input,
        state: n.state
      }))
    })

    // 验证导出的数据包含执行后的状态
    const exportedNode2 = exported.nodes.find(n => n.id === 'node2')
    expect(exportedNode2).toBeDefined()
    expect(Array.isArray(exportedNode2?.input)).toBe(true)
    expect(exportedNode2?.input).toEqual(['01'])
    expect(exportedNode2?.state).toBe('success')
  })
})
