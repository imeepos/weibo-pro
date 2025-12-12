import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { useWorkflowStore } from './workflow.store'
import { WorkflowGraphAst, Compiler, ReactiveScheduler } from '@sker/workflow'
import { root, Injectable } from '@sker/core'
import { TextAreaAst } from '@sker/workflow'
import { firstValueFrom, Observable } from 'rxjs'
import { Handler } from '@sker/workflow'

/**
 * 端到端测试：实际执行工作流并验证导出结果
 *
 * 场景：
 * 1. 创建包含聚合节点的工作流（input 为空字符串）
 * 2. 实际执行工作流（通过 ReactiveScheduler）
 * 3. 等待执行完成
 * 4. 导出工作流
 * 5. 验证导出的节点 input 是数组格式
 */
describe('WorkflowStore E2E - 完整执行流程', () => {
  let compiler: Compiler
  let scheduler: ReactiveScheduler

  // ✨ 注册 TextAreaAst Handler（必须在测试前注册）
  beforeAll(() => {
    @Injectable()
    class MockTextAreaVisitor {
      @Handler(TextAreaAst)
      handler(ast: TextAreaAst, ctx: any) {
        return new Observable(obs => {
          ast.state = 'running'
          obs.next({ ...ast })

          // 模拟 TextAreaAstVisitor 的逻辑
          const outputValue = Array.isArray(ast.input)
            ? ast.input.join('\n')
            : ast.input
          ast.output.next(outputValue)

          ast.state = 'success'
          obs.next({ ...ast })
          obs.complete()
        })
      }
    }

    // 确保 visitor 被注册
    root.get(MockTextAreaVisitor)
  })

  beforeEach(() => {
    // 重置 store
    useWorkflowStore.getState().clear()

    // 获取服务实例
    compiler = root.get(Compiler)
    scheduler = root.get(ReactiveScheduler)
  })

  it('应该在实际执行工作流后正确导出节点状态', async () => {
    const store = useWorkflowStore.getState()

    console.log('\n=== 开始 E2E 测试 ===\n')

    // 创建测试工作流
    const node1 = new TextAreaAst()
    node1.id = 'node1'
    node1.input = ['01']

    const node2 = new TextAreaAst()
    node2.id = 'node2'
    node2.input = ''  // ❌ 初始为空字符串

    const node3 = new TextAreaAst()
    node3.id = 'node3'
    node3.input = ['02']

    // 编译节点
    compiler.compile(node1)
    compiler.compile(node2)
    compiler.compile(node3)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'e2e-test-workflow'
    workflow.name = 'E2E Test'
    workflow.nodes = [node1, node2, node3]
    workflow.edges = [
      {
        id: 'edge1',
        from: 'node1',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data'
      },
      {
        id: 'edge2',
        from: 'node3',
        to: 'node2',
        fromProperty: 'output',
        toProperty: 'input',
        type: 'data'
      }
    ]

    // ✨ 关键：设置入口和结束节点
    workflow.entryNodeIds = ['node1', 'node3']
    workflow.endNodeIds = ['node2']

    compiler.compile(workflow)

    console.log('[E2E] 初始化工作流到 store')
    // 初始化到 store
    store.initWorkflow(workflow)

    // 验证初始状态
    const initialNode2 = store.workflowAst?.nodes.find(n => n.id === 'node2')
    console.log('[E2E] 初始节点2:', {
      input: initialNode2?.input,
      inputType: Array.isArray(initialNode2?.input) ? 'array' : typeof initialNode2?.input
    })

    console.log('[E2E] 开始执行工作流...')
    // ✨ 实际执行工作流
    const result = await firstValueFrom(
      scheduler.schedule(workflow, workflow)
    )

    console.log('[E2E] 工作流执行完成:', {
      state: result.state,
      nodeStates: result.nodes.map(n => ({ id: n.id, state: n.state }))
    })

    // 验证执行成功
    expect(result.state).toBe('success')

    // 等待一小段时间，确保事件传播完成
    await new Promise(resolve => setTimeout(resolve, 100))

    console.log('[E2E] 从 store 获取最新状态')
    // 获取最新的 store 状态
    const latestStore = useWorkflowStore.getState()
    const { workflowAst: finalWorkflow } = latestStore

    console.log('[E2E] Store 中的 workflowAst:', {
      hasWorkflowAst: !!finalWorkflow,
      id: finalWorkflow?.id,
      nodeCount: finalWorkflow?.nodes.length
    })

    // 验证 store 中的状态已更新
    const storeNode2 = finalWorkflow?.nodes.find(n => n.id === 'node2')
    console.log('[E2E] Store 中的节点2:', {
      found: !!storeNode2,
      input: storeNode2?.input,
      inputType: Array.isArray(storeNode2?.input) ? 'array' : typeof storeNode2?.input,
      state: storeNode2?.state
    })

    console.log('[E2E] 导出工作流')
    // 导出工作流
    const exported = latestStore.toAst()

    console.log('[E2E] 导出的工作流:', {
      id: (exported as WorkflowGraphAst).id,
      state: (exported as WorkflowGraphAst).state,
      nodes: exported.nodes.map(n => ({
        id: n.id,
        type: n.type,
        input: n.input,
        inputType: Array.isArray(n.input) ? 'array' : typeof n.input,
        inputLength: Array.isArray(n.input) ? n.input.length : undefined,
        state: n.state
      }))
    })

    // 关键断言：导出的节点2应该包含执行后的数组 input
    const exportedNode2 = exported.nodes.find(n => n.id === 'node2')

    console.log('\n=== 断言检查 ===')
    console.log('exportedNode2 存在?', !!exportedNode2)
    console.log('exportedNode2.input 是数组?', Array.isArray(exportedNode2?.input))
    console.log('exportedNode2.input 值:', exportedNode2?.input)
    console.log('exportedNode2.state:', exportedNode2?.state)
    console.log('=================\n')

    expect(exportedNode2).toBeDefined()
    expect(exportedNode2?.state).toBe('success')
    expect(Array.isArray(exportedNode2?.input)).toBe(true)
    expect(exportedNode2?.input).toEqual(['01', '02'])
  }, 30000)  // 30秒超时

  it('应该在工作流执行过程中实时更新 store', async () => {
    const store = useWorkflowStore.getState()

    console.log('\n=== 实时更新测试 ===\n')

    // 创建简单的单节点工作流
    const node1 = new TextAreaAst()
    node1.id = 'simple-node'
    node1.input = ['test']

    compiler.compile(node1)

    const workflow = new WorkflowGraphAst()
    workflow.id = 'simple-workflow'
    workflow.nodes = [node1]
    workflow.edges = []

    compiler.compile(workflow)

    store.initWorkflow(workflow)

    console.log('[实时更新] 执行单节点工作流')

    // 执行工作流
    const executionPromise = firstValueFrom(
      scheduler.schedule(workflow, workflow)
    )

    // 等待执行完成
    const result = await executionPromise

    console.log('[实时更新] 执行完成:', { state: result.state })

    await new Promise(resolve => setTimeout(resolve, 100))

    // 验证 store 已更新
    const latestStore = useWorkflowStore.getState()
    const finalNode = latestStore.workflowAst?.nodes.find(n => n.id === 'simple-node')

    console.log('[实时更新] Store 中的节点:', {
      state: finalNode?.state,
      count: finalNode?.count
    })

    expect(finalNode?.state).toBe('success')
    expect(finalNode?.count).toBe(1)
  }, 30000)
})
