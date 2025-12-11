import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEventBus, WorkflowEventType } from './workflow-events';

describe('WorkflowEventBus', () => {
  let eventBus: WorkflowEventBus;

  beforeEach(() => {
    eventBus = new WorkflowEventBus();
  });

  describe('事件发射方法', () => {
    it('emitWorkflowStart 发射工作流开始事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      eventBus.emitWorkflowStart('workflow-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.WORKFLOW_START,
        workflowId: 'workflow-1',
      });
      expect(events[0].timestamp).toBeTypeOf('number');
    });

    it('emitWorkflowComplete 发射工作流完成事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      const result = { output: 'success' };
      eventBus.emitWorkflowComplete('workflow-1', result);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.WORKFLOW_COMPLETE,
        workflowId: 'workflow-1',
        payload: result,
      });
    });

    it('emitWorkflowFail 发射工作流失败事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      const error = new Error('workflow failed');
      eventBus.emitWorkflowFail('workflow-1', error);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.WORKFLOW_FAIL,
        workflowId: 'workflow-1',
        payload: error,
      });
    });

    it('emitNodeStart 发射节点开始事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      eventBus.emitNodeStart('node-1', 'workflow-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.NODE_START,
        nodeId: 'node-1',
        workflowId: 'workflow-1',
      });
    });

    it('emitNodeEmit 发射节点输出事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      const output = { data: 'test' };
      eventBus.emitNodeEmit('node-1', output, 'workflow-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.NODE_EMIT,
        nodeId: 'node-1',
        workflowId: 'workflow-1',
        payload: output,
      });
    });

    it('emitNodeSuccess 发射节点成功事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      const result = { status: 'ok' };
      eventBus.emitNodeSuccess('node-1', result, 'workflow-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.NODE_SUCCESS,
        nodeId: 'node-1',
        workflowId: 'workflow-1',
        payload: result,
      });
    });

    it('emitNodeFail 发射节点失败事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      const error = new Error('node failed');
      eventBus.emitNodeFail('node-1', error, 'workflow-1');

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: WorkflowEventType.NODE_FAIL,
        nodeId: 'node-1',
        workflowId: 'workflow-1',
        payload: error,
      });
    });
  });

  describe('ofType 事件过滤', () => {
    it('过滤单个事件类型', () => {
      const nodeFailEvents: any[] = [];
      eventBus.ofType(WorkflowEventType.NODE_FAIL).subscribe(event => {
        nodeFailEvents.push(event);
      });

      eventBus.emitNodeStart('node-1');
      eventBus.emitNodeFail('node-1', new Error('test'));
      eventBus.emitNodeSuccess('node-2', {});

      expect(nodeFailEvents).toHaveLength(1);
      expect(nodeFailEvents[0].type).toBe(WorkflowEventType.NODE_FAIL);
    });

    it('过滤多个事件类型', () => {
      const nodeEvents: any[] = [];
      eventBus
        .ofType(WorkflowEventType.NODE_SUCCESS, WorkflowEventType.NODE_FAIL)
        .subscribe(event => {
          nodeEvents.push(event);
        });

      eventBus.emitNodeStart('node-1');
      eventBus.emitNodeSuccess('node-1', {});
      eventBus.emitWorkflowComplete('workflow-1');
      eventBus.emitNodeFail('node-2', new Error('test'));

      expect(nodeEvents).toHaveLength(2);
      expect(nodeEvents[0].type).toBe(WorkflowEventType.NODE_SUCCESS);
      expect(nodeEvents[1].type).toBe(WorkflowEventType.NODE_FAIL);
    });
  });

  describe('便捷 getter 属性', () => {
    it('nodeFailed$ 只监听节点失败事件', () => {
      const failedNodes: any[] = [];
      eventBus.nodeFailed$.subscribe(event => failedNodes.push(event));

      eventBus.emitNodeStart('node-1');
      eventBus.emitNodeSuccess('node-2', {});
      eventBus.emitNodeFail('node-3', new Error('test'));

      expect(failedNodes).toHaveLength(1);
      expect(failedNodes[0].nodeId).toBe('node-3');
    });

    it('nodeSuccess$ 只监听节点成功事件', () => {
      const successNodes: any[] = [];
      eventBus.nodeSuccess$.subscribe(event => successNodes.push(event));

      eventBus.emitNodeStart('node-1');
      eventBus.emitNodeSuccess('node-1', {});
      eventBus.emitNodeFail('node-2', new Error('test'));

      expect(successNodes).toHaveLength(1);
      expect(successNodes[0].nodeId).toBe('node-1');
    });

    it('workflowEvents$ 只监听工作流级事件', () => {
      const workflowEvents: any[] = [];
      eventBus.workflowEvents$.subscribe(event => workflowEvents.push(event));

      eventBus.emitWorkflowStart('workflow-1');
      eventBus.emitNodeStart('node-1');
      eventBus.emitNodeSuccess('node-1', {});
      eventBus.emitWorkflowComplete('workflow-1');

      expect(workflowEvents).toHaveLength(2);
      expect(workflowEvents[0].type).toBe(WorkflowEventType.WORKFLOW_START);
      expect(workflowEvents[1].type).toBe(WorkflowEventType.WORKFLOW_COMPLETE);
    });
  });

  describe('多订阅者支持', () => {
    it('支持多个订阅者同时监听', () => {
      const subscriber1Events: any[] = [];
      const subscriber2Events: any[] = [];

      eventBus.subscribe(event => subscriber1Events.push(event));
      eventBus.subscribe(event => subscriber2Events.push(event));

      eventBus.emitNodeStart('node-1');
      eventBus.emitNodeSuccess('node-1', {});

      expect(subscriber1Events).toHaveLength(2);
      expect(subscriber2Events).toHaveLength(2);
      expect(subscriber1Events[0].type).toBe(WorkflowEventType.NODE_START);
      expect(subscriber2Events[0].type).toBe(WorkflowEventType.NODE_START);
    });
  });

  describe('destroy 销毁事件总线', () => {
    it('销毁后不再发射事件', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      eventBus.emitNodeStart('node-1');
      eventBus.destroy();
      eventBus.emitNodeSuccess('node-1', {});

      expect(events).toHaveLength(1);
    });
  });

  describe('时间戳记录', () => {
    it('每个事件都包含时间戳', () => {
      const events: any[] = [];
      eventBus.subscribe(event => events.push(event));

      const before = Date.now();
      eventBus.emitNodeStart('node-1');
      const after = Date.now();

      expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });
  });
});
