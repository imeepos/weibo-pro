import { describe, it, expect } from 'vitest';
import {
  updateNodeReducer,
  finalizeWorkflowReducer,
  failWorkflowReducer,
  resetWorkflowReducer,
} from './workflow-reducers';
import { createWorkflowGraphAst } from '../ast';
import type { INode } from '../types';

describe('workflow-reducers', () => {
  describe('updateNodeReducer', () => {
    it('更新节点状态', () => {
      const node = createNode('node-1', 'pending');
      const workflow = createWorkflowGraphAst({
        nodes: [node],
      });

      const updated = updateNodeReducer(workflow, {
        nodeId: 'node-1',
        updates: { state: 'running' },
      });

      expect(updated.nodes[0]!.state).toBe('running');
      expect(updated.state).toBe('running');
    });

    it('节点不存在时返回原状态', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'pending')],
      });

      const updated = updateNodeReducer(workflow, {
        nodeId: 'non-existent',
        updates: { state: 'running' },
      });

      expect(updated).toBe(workflow);
    });

    it('保持原型链（确保 getter 可用）', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'pending')],
      });

      const updated = updateNodeReducer(workflow, {
        nodeId: 'node-1',
        updates: { state: 'running' },
      });

      expect(Object.getPrototypeOf(updated)).toBe(Object.getPrototypeOf(workflow));
      expect(updated.type).toBe('WorkflowGraphAst');
    });

    it('不可变更新（不修改原对象）', () => {
      const node = createNode('node-1', 'pending');
      const workflow = createWorkflowGraphAst({
        nodes: [node],
      });

      const updated = updateNodeReducer(workflow, {
        nodeId: 'node-1',
        updates: { state: 'running' },
      });

      expect(workflow.nodes[0]!.state).toBe('pending');
      expect(updated.nodes[0]!.state).toBe('running');
    });

    describe('计数器逻辑', () => {
      it('running 状态增加 emitCount（从非 running 状态变化时）', () => {
        const node = createNode('node-1', 'pending');
        const workflow = createWorkflowGraphAst({
          nodes: [node],
        });

        const updated = updateNodeReducer(workflow, {
          nodeId: 'node-1',
          updates: { state: 'running' },
        });

        expect(updated.nodes[0]!.emitCount).toBe(1);
        expect(updated.nodes[0]!.count).toBe(0);
      });

      it('success 状态增加 count', () => {
        const node = createNode('node-1', 'running');
        const workflow = createWorkflowGraphAst({
          nodes: [node],
        });

        const updated = updateNodeReducer(workflow, {
          nodeId: 'node-1',
          updates: { state: 'success' },
        });

        expect(updated.nodes[0]!.count).toBe(1);
        expect(updated.nodes[0]!.emitCount).toBe(0);
      });

      it('fail 状态增加 count', () => {
        const node = createNode('node-1', 'running');
        const workflow = createWorkflowGraphAst({
          nodes: [node],
        });

        const updated = updateNodeReducer(workflow, {
          nodeId: 'node-1',
          updates: { state: 'fail' },
        });

        expect(updated.nodes[0]!.count).toBe(1);
        expect(updated.nodes[0]!.emitCount).toBe(0);
      });

      it('多次 success 状态累加 count', () => {
        const node = createNode('node-1', 'running');
        const workflow = createWorkflowGraphAst({
          nodes: [node],
        });

        let updated = updateNodeReducer(workflow, {
          nodeId: 'node-1',
          updates: { state: 'success' },
        });

        updated = updateNodeReducer(updated, {
          nodeId: 'node-1',
          updates: { state: 'success' },
        });

        expect(updated.nodes[0]!.count).toBe(2);
      });
    });

    it('更新多个属性', () => {
      const node = createNode('node-1', 'pending');
      const workflow = createWorkflowGraphAst({
        nodes: [node],
      });

      const updated = updateNodeReducer(workflow, {
        nodeId: 'node-1',
        updates: { state: 'success', name: 'Updated Node' },
      });

      expect(updated.nodes[0]!.state).toBe('success');
      expect(updated.nodes[0]!.name).toBe('Updated Node');
    });
  });

  describe('finalizeWorkflowReducer', () => {
    it('所有节点成功时工作流状态为 success', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'success'),
        ],
      });

      const finalized = finalizeWorkflowReducer(workflow);

      expect(finalized.state).toBe('success');
    });

    it('任一节点失败时工作流状态为 fail', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'fail'),
        ],
      });

      const finalized = finalizeWorkflowReducer(workflow);

      expect(finalized.state).toBe('fail');
    });

    it('保持原型链', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'success')],
      });

      const finalized = finalizeWorkflowReducer(workflow);

      expect(Object.getPrototypeOf(finalized)).toBe(Object.getPrototypeOf(workflow));
    });

    it('不修改原对象', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'success')],
      });
      const originalState = workflow.state;

      const finalized = finalizeWorkflowReducer(workflow);

      expect(workflow.state).toBe(originalState);
      expect(finalized.state).toBe('success');
    });
  });

  describe('failWorkflowReducer', () => {
    it('标记工作流为失败状态', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'running')],
      });

      const error = new Error('Workflow failed');
      const failed = failWorkflowReducer(workflow, error);

      expect(failed.state).toBe('fail');
      expect(failed.error).toBeDefined();
      expect(failed.error?.message).toBe('Workflow failed');
    });

    it('保持原型链', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'running')],
      });

      const failed = failWorkflowReducer(workflow, new Error('test'));

      expect(Object.getPrototypeOf(failed)).toBe(Object.getPrototypeOf(workflow));
    });

    it('不修改原对象', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'running')],
      });
      const originalState = workflow.state;

      const failed = failWorkflowReducer(workflow, new Error('test'));

      expect(workflow.state).toBe(originalState);
      expect(failed.state).toBe('fail');
    });
  });

  describe('resetWorkflowReducer', () => {
    it('重置工作流和所有节点为初始状态', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'fail'),
        ],
        state: 'fail',
      });

      workflow.nodes[0]!.count = 3;
      workflow.nodes[0]!.emitCount = 5;
      workflow.nodes[1]!.count = 2;

      const reset = resetWorkflowReducer(workflow);

      expect(reset.state).toBe('pending');
      expect(reset.nodes[0]!.state).toBe('pending');
      expect(reset.nodes[0]!.count).toBe(0);
      expect(reset.nodes[0]!.emitCount).toBe(0);
      expect(reset.nodes[0]!.error).toBeUndefined();
      expect(reset.nodes[1]!.state).toBe('pending');
      expect(reset.nodes[1]!.count).toBe(0);
    });

    it('保持原型链', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'success')],
      });

      const reset = resetWorkflowReducer(workflow);

      expect(Object.getPrototypeOf(reset)).toBe(Object.getPrototypeOf(workflow));
    });

    it('不修改原对象', () => {
      const workflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'success')],
        state: 'success',
      });
      workflow.nodes[0]!.count = 3;

      const reset = resetWorkflowReducer(workflow);

      expect(workflow.state).toBe('success');
      expect(workflow.nodes[0]!.count).toBe(3);
      expect(reset.state).toBe('pending');
      expect(reset.nodes[0]!.count).toBe(0);
    });

    it('清除节点错误信息', () => {
      const node = createNode('node-1', 'fail');
      node.error = { message: 'test error', name: 'Error' };
      const workflow = createWorkflowGraphAst({
        nodes: [node],
      });

      const reset = resetWorkflowReducer(workflow);

      expect(reset.nodes[0]!.error).toBeUndefined();
    });
  });
});

function createNode(id: string, state: INode['state']): INode {
  return {
    id,
    type: 'TestNode',
    state,
    count: 0,
    emitCount: 0,
    position: { x: 0, y: 0 },
    error: undefined,
    metadata: {
      class: {},
      inputs: [],
      outputs: [],
      states: [],
    },
  };
}
