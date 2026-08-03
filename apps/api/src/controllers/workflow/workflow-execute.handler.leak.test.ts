import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Observable } from 'rxjs';
import { root } from '@sker/core';

// mock @sker/workflow：让 executeAstWithWorkflowGraph 返回可观察 teardown 的流
vi.mock('@sker/workflow', () => {
  return {
    fromJson: (x: unknown) => x,
    getNodeById: vi.fn(() => ({ id: 'n1', state: 'running' })),
    executeAst: vi.fn(),
    executeAstWithWorkflowGraph: vi.fn(),
  };
});

// mock WorkflowRunService 模块：避免拉起重型依赖
vi.mock('../../services/workflow-run.service', () => {
  class MockWorkflowRunService {
    getRun = vi.fn();
  }
  return { WorkflowRunService: MockWorkflowRunService };
});

import * as workflow from '@sker/workflow';
import { WorkflowRunService } from '../../services/workflow-run.service';
import { WorkflowExecuteHandler } from './workflow-execute.handler';

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * fineTuneNode 用 new Observable(observer => { runPromise.then(... return executeAstWithWorkflowGraph(...).subscribe(observer)) })
 * 内层返回 Subscription 对象而非 teardown 函数，RxJS 忽略之。
 * 客户端断开（框架 req.on('close') 只 unsubscribe 外层）后，内层工作流执行继续在后台跑（僵尸执行）。
 */
describe('WorkflowExecuteHandler.fineTuneNode SSE 内层订阅拆除', () => {
  let teardownSpy: ReturnType<typeof vi.fn>;
  let handler: WorkflowExecuteHandler;

  beforeEach(() => {
    teardownSpy = vi.fn();
    vi.clearAllMocks();
    const svc = new WorkflowRunService();
    root.set([{ provide: WorkflowRunService, useValue: svc }]);
    handler = new WorkflowExecuteHandler();
    (workflow.executeAstWithWorkflowGraph as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Observable(() => () => (teardownSpy as unknown as () => void)()),
    );
  });

  it('内层订阅启动后客户端断开（unsubscribe），内层工作流订阅被拆除', async () => {
    const svc = root.get(WorkflowRunService) as unknown as { getRun: ReturnType<typeof vi.fn> };
    let resolveRun!: (v: unknown) => void;
    svc.getRun.mockReturnValue(new Promise((res) => { resolveRun = res; }));

    const obs = handler.fineTuneNode('r1', 'n1', { config: {} });
    const sub = obs.subscribe({ next: () => {}, error: () => {} });

    // runPromise 解析，内层订阅启动
    await Promise.resolve();
    resolveRun({ id: 'r1', graphSnapshot: '{}' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // 客户端断开（req.on('close'）：外层 unsubscribe），内层 teardown 应被调用
    sub.unsubscribe();
    expect(teardownSpy).toHaveBeenCalled();
  });

  it('客户端在 runPromise 解析前断开时，不应启动内层工作流订阅（先启动再取消窗口）', async () => {
    const svc = root.get(WorkflowRunService) as unknown as { getRun: ReturnType<typeof vi.fn> };
    svc.getRun.mockResolvedValue({ id: 'r1', graphSnapshot: '{}' });
    const executeSpy = workflow.executeAstWithWorkflowGraph as unknown as ReturnType<typeof vi.fn>;

    const obs = handler.fineTuneNode('r1', 'n1', { config: {} });
    const sub = obs.subscribe({ next: () => {}, error: () => {} });

    // 在 runPromise 解析前断开客户端连接
    sub.unsubscribe();

    // 让 runPromise.then 的微任务执行完——此时 disposed 已为 true，
    // 若实现仍先 subscribe 再退订，executeSpy 会被调用（副作用已发生）
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(executeSpy).not.toHaveBeenCalled();
  });
});
