import { describe, it, expect, beforeEach } from 'vitest'
import { useExecutionStore } from './execution.store'
import type { IAstStates } from '@sker/workflow'

describe('Execution Store', () => {
  beforeEach(() => {
    useExecutionStore.setState({
      isExecuting: false,
      executionError: null,
      nodeStates: {},
      nodeHistory: {},
    })
  })

  describe('执行状态管理', () => {
    it('应该开始执行', () => {
      const { startExecution } = useExecutionStore.getState()
      startExecution()

      const state = useExecutionStore.getState()
      expect(state.isExecuting).toBe(true)
      expect(state.executionError).toBeNull()
    })

    it('应该完成执行', () => {
      const store = useExecutionStore.getState()
      store.startExecution()
      expect(useExecutionStore.getState().isExecuting).toBe(true)

      store.finishExecution()
      expect(useExecutionStore.getState().isExecuting).toBe(false)
    })

    it('应该记录执行错误', () => {
      const error = new Error('测试错误')
      const { failExecution } = useExecutionStore.getState()
      failExecution(error)

      const state = useExecutionStore.getState()
      expect(state.isExecuting).toBe(false)
      expect(state.executionError).toBe(error)
    })
  })

  describe('节点状态管理', () => {
    it('应该更新单个节点状态', () => {
      const { updateNodeState } = useExecutionStore.getState()
      updateNodeState('node-1', 'pending')

      expect(useExecutionStore.getState().nodeStates['node-1']).toBe('pending')
    })

    it('应该批量更新节点状态', () => {
      const { updateNodeStates } = useExecutionStore.getState()
      const states = {
        'node-1': 'pending' as IAstStates,
        'node-2': 'running' as IAstStates,
        'node-3': 'success' as IAstStates,
      }

      updateNodeStates(states)

      const storeState = useExecutionStore.getState().nodeStates
      expect(storeState['node-1']).toBe('pending')
      expect(storeState['node-2']).toBe('running')
      expect(storeState['node-3']).toBe('success')
    })

    it('应该保留之前的节点状态当批量更新时', () => {
      const store = useExecutionStore.getState()
      store.updateNodeState('node-1', 'running')

      store.updateNodeStates({
        'node-2': 'pending' as IAstStates,
      })

      const storeState = useExecutionStore.getState().nodeStates
      expect(storeState['node-1']).toBe('running')
      expect(storeState['node-2']).toBe('pending')
    })
  })

  describe('节点执行记录', () => {
    it('应该记录节点执行开始', () => {
      const { recordNodeStart } = useExecutionStore.getState()
      const recordId = recordNodeStart('node-1')

      const history = useExecutionStore.getState().nodeHistory['node-1']
      expect(history).toBeDefined()
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe(recordId)
      expect(history[0].nodeId).toBe('node-1')
      expect(history[0].status).toBe('running')
    })

    it('应该记录节点执行完成', () => {
      const store = useExecutionStore.getState()
      const recordId = store.recordNodeStart('node-1')

      store.recordNodeComplete('node-1', recordId, 'success', undefined, { result: 'done' })

      const history = useExecutionStore.getState().nodeHistory['node-1']
      expect(history).toHaveLength(1)
      expect(history[0].status).toBe('success')
      expect(history[0].outputs).toEqual({ result: 'done' })
      expect(history[0].completedAt).toBeDefined()
    })

    it('应该记录节点执行错误', () => {
      const store = useExecutionStore.getState()
      const recordId = store.recordNodeStart('node-1')
      const error = { message: '节点执行失败' }

      store.recordNodeComplete('node-1', recordId, 'fail', error)

      const history = useExecutionStore.getState().nodeHistory['node-1']
      expect(history[0].status).toBe('fail')
      expect(history[0].error).toEqual(error)
    })

    it('应该限制单个节点的历史记录数量', () => {
      const store = useExecutionStore.getState()

      for (let i = 0; i < 25; i++) {
        const recordId = store.recordNodeStart('node-1')
        store.recordNodeComplete('node-1', recordId, 'success')
      }

      const history = useExecutionStore.getState().nodeHistory['node-1']
      expect(history.length).toBeLessThanOrEqual(20)
    })

    it('应该为多个节点分别维护历史', () => {
      const store = useExecutionStore.getState()

      const recordId1 = store.recordNodeStart('node-1')
      const recordId2 = store.recordNodeStart('node-2')

      store.recordNodeComplete('node-1', recordId1, 'success')
      store.recordNodeComplete('node-2', recordId2, 'fail')

      const history1 = useExecutionStore.getState().nodeHistory['node-1']
      const history2 = useExecutionStore.getState().nodeHistory['node-2']

      expect(history1).toHaveLength(1)
      expect(history2).toHaveLength(1)
      expect(history1[0].status).toBe('success')
      expect(history2[0].status).toBe('fail')
    })

    it('应该获取节点执行历史', () => {
      const store = useExecutionStore.getState()

      const recordId1 = store.recordNodeStart('node-1')
      const recordId2 = store.recordNodeStart('node-1')

      store.recordNodeComplete('node-1', recordId1, 'success')
      store.recordNodeComplete('node-1', recordId2, 'fail')

      const history = store.getNodeHistory('node-1')
      expect(history).toHaveLength(2)
      expect(history[0].status).toBe('success')
      expect(history[1].status).toBe('fail')
    })

    it('应该返回空数组如果节点没有历史', () => {
      const { getNodeHistory } = useExecutionStore.getState()
      const history = getNodeHistory('unknown-node')

      expect(history).toEqual([])
    })
  })

  describe('重置', () => {
    it('应该重置所有执行状态', () => {
      const store = useExecutionStore.getState()
      store.startExecution()
      store.updateNodeState('node-1', 'running')
      const recordId = store.recordNodeStart('node-2')

      store.resetExecution()

      const state = useExecutionStore.getState()
      expect(state.isExecuting).toBe(false)
      expect(state.executionError).toBeNull()
      expect(state.nodeStates).toEqual({})
      expect(state.nodeHistory).toEqual({})
    })
  })

  describe('完整执行流程', () => {
    it('应该模拟完整的执行周期', () => {
      const store = useExecutionStore.getState()

      // 1. 开始执行
      store.startExecution()
      expect(useExecutionStore.getState().isExecuting).toBe(true)

      // 2. 执行节点1
      const recordId1 = store.recordNodeStart('node-1')
      store.updateNodeState('node-1', 'running')

      // 3. 执行节点2
      const recordId2 = store.recordNodeStart('node-2')
      store.updateNodeState('node-2', 'running')

      // 4. 节点1完成
      store.recordNodeComplete('node-1', recordId1, 'success', undefined, { value: 42 })
      store.updateNodeState('node-1', 'success')

      // 5. 节点2失败
      store.recordNodeComplete('node-2', recordId2, 'fail', { message: 'Failed' })
      store.updateNodeState('node-2', 'fail')

      // 6. 完成执行
      store.finishExecution()

      const state = useExecutionStore.getState()
      expect(state.isExecuting).toBe(false)
      expect(state.nodeStates['node-1']).toBe('success')
      expect(state.nodeStates['node-2']).toBe('fail')
      expect(state.nodeHistory['node-1'][0].outputs).toEqual({ value: 42 })
    })
  })
})
