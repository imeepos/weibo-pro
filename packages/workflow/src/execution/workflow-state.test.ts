import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowState } from './workflow-state';
import { createWorkflowGraphAst } from '../ast';
import type { INode } from '../types';

describe('WorkflowState', () => {
  let workflowState: WorkflowState;

  beforeEach(() => {
    const workflow = createWorkflowGraphAst({
      nodes: [
        createNode('node-1', 'pending'),
        createNode('node-2', 'pending'),
      ],
    });
    workflowState = new WorkflowState(workflow);
  });

  describe('current getter', () => {
    it('同步访问当前工作流状态', () => {
      const current = workflowState.current;

      expect(current.nodes).toHaveLength(2);
      expect(current.nodes[0].id).toBe('node-1');
    });

    it('状态更新后 current 返回最新值', () => {
      const updatedWorkflow = createWorkflowGraphAst({
        nodes: [createNode('node-1', 'success')],
      });

      workflowState.next(updatedWorkflow);

      expect(workflowState.current.nodes).toHaveLength(1);
      expect(workflowState.current.nodes[0].state).toBe('success');
    });
  });

  describe('selectNode', () => {
    it('选择特定节点状态', done => {
      const updates: any[] = [];
      workflowState.selectNode('node-1').subscribe(node => {
        updates.push(node);
        if (updates.length === 2) {
          expect(updates[0]?.state).toBe('pending');
          expect(updates[1]?.state).toBe('running');
          done();
        }
      });

      setTimeout(() => {
        const workflow = workflowState.current;
        workflow.nodes[0].state = 'running';
        workflowState.next(workflow);
      }, 10);
    });

    it('节点不存在时返回 undefined', done => {
      workflowState.selectNode('non-existent').subscribe(node => {
        expect(node).toBeUndefined();
        done();
      });
    });

    it('distinctUntilChanged - 相同状态不重复发射', done => {
      const emissions: any[] = [];
      workflowState.selectNode('node-1').subscribe(node => {
        emissions.push(node);
      });

      const workflow = workflowState.current;

      setTimeout(() => {
        workflowState.next({ ...workflow });
      }, 10);

      setTimeout(() => {
        workflowState.next({ ...workflow });
      }, 20);

      setTimeout(() => {
        expect(emissions).toHaveLength(1);
        done();
      }, 50);
    });

    it('状态变化时发射新值', done => {
      const emissions: any[] = [];
      workflowState.selectNode('node-1').subscribe(node => {
        emissions.push(node);
        if (emissions.length === 2) {
          expect(emissions[0]?.state).toBe('pending');
          expect(emissions[1]?.state).toBe('running');
          done();
        }
      });

      setTimeout(() => {
        const workflow = workflowState.current;
        workflow.nodes[0].state = 'running';
        workflowState.next({ ...workflow, nodes: [...workflow.nodes] });
      }, 10);
    });
  });

  describe('progress$', () => {
    it('计算工作流执行进度', done => {
      workflowState.progress$.subscribe(progress => {
        expect(progress.total).toBe(2);
        expect(progress.completed).toBe(0);
        expect(progress.percentage).toBe(0);
        done();
      });
    });

    it('节点完成时更新进度', done => {
      const emissions: any[] = [];
      workflowState.progress$.subscribe(progress => {
        emissions.push(progress);
        if (emissions.length === 2) {
          expect(emissions[1].completed).toBe(1);
          expect(emissions[1].percentage).toBe(50);
          done();
        }
      });

      setTimeout(() => {
        const workflow = workflowState.current;
        workflow.nodes[0].state = 'success';
        workflowState.next({ ...workflow, nodes: [...workflow.nodes] });
      }, 10);
    });

    it('包含成功和失败的节点', done => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'fail'),
          createNode('node-3', 'pending'),
        ],
      });
      workflowState = new WorkflowState(workflow);

      workflowState.progress$.subscribe(progress => {
        expect(progress.total).toBe(3);
        expect(progress.completed).toBe(2);
        expect(progress.percentage).toBeCloseTo(66.67, 1);
        done();
      });
    });

    it('空工作流进度为 0', done => {
      const workflow = createWorkflowGraphAst({ nodes: [] });
      workflowState = new WorkflowState(workflow);

      workflowState.progress$.subscribe(progress => {
        expect(progress.total).toBe(0);
        expect(progress.completed).toBe(0);
        expect(progress.percentage).toBe(0);
        done();
      });
    });

    it('distinctUntilChanged - 相同百分比不重复发射', done => {
      const emissions: any[] = [];
      workflowState.progress$.subscribe(progress => {
        emissions.push(progress);
      });

      setTimeout(() => {
        workflowState.next(workflowState.current);
      }, 10);

      setTimeout(() => {
        expect(emissions).toHaveLength(1);
        done();
      }, 30);
    });
  });

  describe('failedNodes$', () => {
    it('返回失败的节点列表', done => {
      const workflow = createWorkflowGraphAst({
        nodes: [
          createNode('node-1', 'success'),
          createNode('node-2', 'fail'),
          createNode('node-3', 'fail'),
        ],
      });
      workflowState = new WorkflowState(workflow);

      workflowState.failedNodes$.subscribe(failedNodes => {
        expect(failedNodes).toHaveLength(2);
        expect(failedNodes[0].id).toBe('node-2');
        expect(failedNodes[1].id).toBe('node-3');
        done();
      });
    });

    it('无失败节点时返回空数组', done => {
      workflowState.failedNodes$.subscribe(failedNodes => {
        expect(failedNodes).toHaveLength(0);
        done();
      });
    });

    it('节点失败时更新列表', done => {
      const emissions: any[] = [];
      workflowState.failedNodes$.subscribe(failedNodes => {
        emissions.push(failedNodes);
        if (emissions.length === 2) {
          expect(emissions[0]).toHaveLength(0);
          expect(emissions[1]).toHaveLength(1);
          expect(emissions[1][0].id).toBe('node-1');
          done();
        }
      });

      setTimeout(() => {
        const workflow = workflowState.current;
        workflow.nodes[0].state = 'fail';
        workflowState.next({ ...workflow, nodes: [...workflow.nodes] });
      }, 10);
    });

    it('distinctUntilChanged - 相同失败列表不重复发射', done => {
      const emissions: any[] = [];
      workflowState.failedNodes$.subscribe(failedNodes => {
        emissions.push(failedNodes);
      });

      setTimeout(() => {
        workflowState.next(workflowState.current);
      }, 10);

      setTimeout(() => {
        expect(emissions).toHaveLength(1);
        done();
      }, 30);
    });
  });

  describe('workflowState$', () => {
    it('返回工作流整体状态', done => {
      workflowState.workflowState$.subscribe(state => {
        expect(state).toBe('pending');
        done();
      });
    });

    it('状态变化时发射新值', done => {
      const emissions: any[] = [];
      workflowState.workflowState$.subscribe(state => {
        emissions.push(state);
        if (emissions.length === 2) {
          expect(emissions[0]).toBe('pending');
          expect(emissions[1]).toBe('running');
          done();
        }
      });

      setTimeout(() => {
        const workflow = workflowState.current;
        workflow.state = 'running';
        workflowState.next({ ...workflow });
      }, 10);
    });

    it('distinctUntilChanged - 相同状态不重复发射', done => {
      const emissions: any[] = [];
      workflowState.workflowState$.subscribe(state => {
        emissions.push(state);
      });

      setTimeout(() => {
        workflowState.next(workflowState.current);
      }, 10);

      setTimeout(() => {
        expect(emissions).toHaveLength(1);
        done();
      }, 30);
    });
  });

  describe('destroy', () => {
    it('销毁后状态流完成', done => {
      let completed = false;
      workflowState.subscribe({
        complete: () => {
          completed = true;
        },
      });

      workflowState.destroy();

      setTimeout(() => {
        expect(completed).toBe(true);
        done();
      }, 10);
    });

    it('销毁后不再发射事件', () => {
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

      expect(emissions.length).toBe(initialEmissions);
    });
  });

  describe('响应式状态流', () => {
    it('继承自 BehaviorSubject，支持订阅', done => {
      let receivedWorkflow: any;
      workflowState.subscribe(workflow => {
        receivedWorkflow = workflow;
        expect(workflow.nodes).toHaveLength(2);
        done();
      });
    });

    it('新订阅者立即收到当前状态', done => {
      setTimeout(() => {
        workflowState.subscribe(workflow => {
          expect(workflow.nodes).toHaveLength(2);
          done();
        });
      }, 10);
    });

    it('多个订阅者同时接收更新', done => {
      const subscriber1Updates: any[] = [];
      const subscriber2Updates: any[] = [];

      workflowState.subscribe(workflow => subscriber1Updates.push(workflow));
      workflowState.subscribe(workflow => subscriber2Updates.push(workflow));

      setTimeout(() => {
        const workflow = workflowState.current;
        workflow.nodes[0].state = 'success';
        workflowState.next({ ...workflow, nodes: [...workflow.nodes] });
      }, 10);

      setTimeout(() => {
        expect(subscriber1Updates.length).toBeGreaterThan(1);
        expect(subscriber2Updates.length).toBeGreaterThan(1);
        done();
      }, 30);
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
