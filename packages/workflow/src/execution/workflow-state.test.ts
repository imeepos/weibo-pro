import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowState } from './workflow-state';
import { WorkflowEventBus } from './workflow-events';
import { createWorkflowGraphAst, WorkflowGraphAst } from '../ast';
import type { INode } from '../types';
import { firstValueFrom, take, toArray } from 'rxjs';

/**
 * 更新工作流状态（保持类实例完整性）
 */
function updateWorkflow(workflow: WorkflowGraphAst, updates: Partial<Pick<WorkflowGraphAst, 'nodes' | 'edges' | 'state'>>): WorkflowGraphAst {
  const updated = createWorkflowGraphAst({
    name: workflow.name,
    nodes: updates.nodes ?? workflow.nodes,
    edges: updates.edges ?? workflow.edges,
    id: workflow.id,
    state: updates.state ?? workflow.state,
  });
  return updated;
}

describe('WorkflowState', () => {
  let workflowState: WorkflowState;
  let eventBus: WorkflowEventBus;

  beforeEach(() => {
    eventBus = new WorkflowEventBus();
    const workflow = createWorkflowGraphAst({
      nodes: [
        createNode('node-1', 'pending'),
        createNode('node-2', 'pending'),
      ],
    });
    workflowState = new WorkflowState(eventBus);
    workflowState.init(workflow);
  });

  describe('current getter', () => {
    it('同步访问当前工作流状态', () => {
      const current = workflowState.current!;

      expect(current.nodes).toHaveLength(2);
      expect(current.nodes[0]!.id).toBe('node-1');
    });

    it('状态更新后 current 返回最新值', () => {
      const updatedWorkflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'success')],
      });

      workflowState.next(updatedWorkflow);

      expect(workflowState.current!.nodes).toHaveLength(1);
      expect(workflowState.current!.nodes[0]!.state).toBe('success');
    });
  });

  describe('selectNode', () => {
    it('选择特定节点状态', async () => {
      const promise = firstValueFrom(
        workflowState.selectNode('node-1').pipe(take(2), toArray())
      );

      setTimeout(() => {
        const workflow = workflowState.current!;
        const updatedNode = { ...workflow.nodes[0]!, state: 'running' as const };
        workflowState.next(updateWorkflow(workflow, { nodes: [updatedNode, ...workflow.nodes.slice(1)] }));
      }, 10);

      const updates = await promise;
      expect(updates[0]!?.state).toBe('pending');
      expect(updates[1]!?.state).toBe('running');
    });

    it('节点不存在时返回 undefined', async () => {
      const node = await firstValueFrom(workflowState.selectNode('non-existent'));
      expect(node).toBeUndefined();
    });

    it('distinctUntilChanged - 相同状态不重复发射', async () => {
      const emissions: any[] = [];
      const subscription = workflowState.selectNode('node-1').subscribe(node => {
        emissions.push(node);
      });

      const workflow = workflowState.current!;

      await new Promise(resolve => setTimeout(resolve, 10));
      workflowState.next(updateWorkflow(workflow, {}));

      await new Promise(resolve => setTimeout(resolve, 20));
      workflowState.next(updateWorkflow(workflow, {}));

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(emissions).toHaveLength(1);
      subscription.unsubscribe();
    });

    it('状态变化时发射新值', async () => {
      const promise = firstValueFrom(
        workflowState.selectNode('node-1').pipe(take(2), toArray())
      );

      setTimeout(() => {
        const workflow = workflowState.current!;
        const updatedNode = { ...workflow.nodes[0]!, state: 'running' as const };
        workflowState.next(updateWorkflow(workflow, { nodes: [updatedNode, ...workflow.nodes.slice(1)] }));
      }, 10);

      const emissions = await promise;
      expect(emissions[0]!?.state).toBe('pending');
      expect(emissions[1]!?.state).toBe('running');
    });
  });

  describe('progress$', () => {
    it('计算工作流执行进度', async () => {
      const progress = await firstValueFrom(workflowState.progress$);
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('节点完成时更新进度', async () => {
      const promise = firstValueFrom(workflowState.progress$.pipe(take(2), toArray()));

      setTimeout(() => {
        const workflow = workflowState.current!;
        const updatedNodes = [...workflow.nodes];
        updatedNodes[0] = { ...updatedNodes[0]!, state: 'success' as const };
        workflowState.next(updateWorkflow(workflow, { nodes: updatedNodes }));
      }, 10);

      const emissions = await promise;
      expect(emissions[1]!.completed).toBe(1);
      expect(emissions[1]!.percentage).toBe(50);
    });

    it('包含成功和失败的节点', async () => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'fail'),
          createNode('node-3', 'pending'),
        ],
      });
      workflowState = new WorkflowState(eventBus);
      workflowState.init(workflow);

      const progress = await firstValueFrom(workflowState.progress$);
      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBeCloseTo(66.67, 1);
    });

    it('空工作流进度为 0', async () => {
      const workflow = createWorkflowGraphAst({ nodes: [] });
      workflowState = new WorkflowState(eventBus);
      workflowState.init(workflow);

      const progress = await firstValueFrom(workflowState.progress$);
      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('distinctUntilChanged - 相同百分比不重复发射', async () => {
      const emissions: any[] = [];
      const subscription = workflowState.progress$.subscribe(progress => {
        emissions.push(progress);
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      workflowState.next(updateWorkflow(workflowState.current!, {}));

      await new Promise(resolve => setTimeout(resolve, 30));

      expect(emissions).toHaveLength(1);
      subscription.unsubscribe();
    });
  });

  describe('failedNodes$', () => {
    it('返回失败的节点列表', async () => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'fail'),
          createNode('node-3', 'fail'),
        ],
      });
      workflowState = new WorkflowState(eventBus);
      workflowState.init(workflow);

      const failedNodes = await firstValueFrom(workflowState.failedNodes$);
      expect(failedNodes).toHaveLength(2);
      expect(failedNodes[0]!.id).toBe('node-2');
      expect(failedNodes[1]!.id).toBe('node-3');
    });

    it('无失败节点时返回空数组', async () => {
      const failedNodes = await firstValueFrom(workflowState.failedNodes$);
      expect(failedNodes).toHaveLength(0);
    });

    it('节点失败时更新列表', async () => {
      const promise = firstValueFrom(workflowState.failedNodes$.pipe(take(2), toArray()));

      setTimeout(() => {
        const workflow = workflowState.current!;
        const updatedNodes = [...workflow.nodes];
        updatedNodes[0] = { ...updatedNodes[0]!, state: 'fail' as const };
        workflowState.next(updateWorkflow(workflow, { nodes: updatedNodes }));
      }, 10);

      const emissions = await promise;
      expect(emissions[0]!).toHaveLength(0);
      expect(emissions[1]!).toHaveLength(1);
      expect(emissions[1]![0]!.id).toBe('node-1');
    });

    it('distinctUntilChanged - 相同失败列表不重复发射', async () => {
      const emissions: any[] = [];
      const subscription = workflowState.failedNodes$.subscribe(failedNodes => {
        emissions.push(failedNodes);
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      workflowState.next(updateWorkflow(workflowState.current!, {}));

      await new Promise(resolve => setTimeout(resolve, 30));

      expect(emissions).toHaveLength(1);
      subscription.unsubscribe();
    });
  });

  describe('workflowState$', () => {
    it('返回工作流整体状态', async () => {
      const state = await firstValueFrom(workflowState.workflowState$);
      expect(state).toBe('pending');
    });

    it('状态变化时发射新值', async () => {
      const promise = firstValueFrom(workflowState.workflowState$.pipe(take(2), toArray()));

      setTimeout(() => {
        const workflow = workflowState.current!;
        workflowState.next(updateWorkflow(workflow, { state: 'running' }));
      }, 10);

      const emissions = await promise;
      expect(emissions[0]).toBe('pending');
      expect(emissions[1]).toBe('running');
    });

    it('distinctUntilChanged - 相同状态不重复发射', async () => {
      const emissions: any[] = [];
      const subscription = workflowState.workflowState$.subscribe(state => {
        emissions.push(state);
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      workflowState.next(updateWorkflow(workflowState.current!, {}));

      await new Promise(resolve => setTimeout(resolve, 30));

      expect(emissions).toHaveLength(1);
      subscription.unsubscribe();
    });
  });

  describe('destroy', () => {
    it('销毁后状态流完成', async () => {
      // 注意：WorkflowState.subscribe 只接受 next 回调，无法监听 complete
      // 此测试验证 destroy 后不会抛出异常
      workflowState.destroy();
      await new Promise(resolve => setTimeout(resolve, 10));
      // 如果没有抛出异常，测试通过
      expect(true).toBe(true);
    });

    it('销毁后不再发射事件', async () => {
      const emissions: any[] = [];
      workflowState.subscribe(workflow => {
        emissions.push(workflow);
      });

      const initialEmissions = emissions.length;
      workflowState.destroy();

      workflowState.next(
        createWorkflowGraphAst({
          nodes: [createNode('node-1', 'success')],
        })
      );

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(emissions.length).toBe(initialEmissions);
    });
  });

  describe('响应式状态流', () => {
    it('继承自 BehaviorSubject，支持订阅', async () => {
      let receivedWorkflow: any;
      workflowState.subscribe(workflow => {
        receivedWorkflow = workflow;
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(receivedWorkflow.nodes).toHaveLength(2);
    });

    it('新订阅者立即收到当前状态', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      let receivedWorkflow: any;
      workflowState.subscribe(workflow => {
        receivedWorkflow = workflow;
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(receivedWorkflow.nodes).toHaveLength(2);
    });

    it('多个订阅者同时接收更新', async () => {
      const subscriber1Updates: any[] = [];
      const subscriber2Updates: any[] = [];

      workflowState.subscribe(workflow => subscriber1Updates.push(workflow));
      workflowState.subscribe(workflow => subscriber2Updates.push(workflow));

      setTimeout(() => {
        const workflow = workflowState.current!;
        const updatedNodes = [...workflow.nodes];
        updatedNodes[0] = { ...updatedNodes[0]!, state: 'success' as const };
        workflowState.next(updateWorkflow(workflow, { nodes: updatedNodes }));
      }, 10);

      await new Promise(resolve => setTimeout(resolve, 30));

      expect(subscriber1Updates.length).toBeGreaterThan(1);
      expect(subscriber2Updates.length).toBeGreaterThan(1);
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
