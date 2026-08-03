import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Observable } from 'rxjs';

// mock @sker/workflow：让 executeAst 返回可观察 teardown 的流
vi.mock('@sker/workflow', () => {
  return {
    executeAst: vi.fn(),
    NodeEvent: undefined,
  };
});

// mock @sker/workflow-ast
vi.mock('@sker/workflow-ast', () => {
  return { PromptOptimizerAst: class {} };
});

// mock @sker/entities：useEntityManager 直接执行回调，manager 返回任务
vi.mock('@sker/entities', () => {
  class MockTask {
    id = 'task-1';
    targetOutput = 'x';
    targetContext = '';
    optimizationConfig = { maxIterations: 3, targetScore: 1, testRuns: 1, model: 'x', temperature: 0.5 };
    evaluationCriteria = {};
    status = 'pending';
    startedAt: Date | null = null;
  }
  return {
    useEntityManager: vi.fn(async (fn: (m: unknown) => Promise<void>) => {
      const manager = {
        findOne: vi.fn(async () => new MockTask()),
        save: vi.fn(),
      };
      await fn(manager);
    }),
    PromptOptimizationTaskEntity: class {},
    PromptVersionEntity: class {},
    OptimizationTaskStatus: { RUNNING: 'running' },
  };
});

import * as workflow from '@sker/workflow';
import { PromptOptimizerController } from './prompt-optimizer.controller';

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * executeTask 用 new Observable(observer => { useEntityManager(async m => { ... return executeAst(ast, {}).subscribe(observer) }) })
 * 内层返回 Subscription 对象而非 teardown 函数，RxJS 忽略之。
 * 客户端断开后，内层工作流执行继续在后台跑（僵尸执行）。
 */
describe('PromptOptimizerController.executeTask SSE 内层订阅拆除', () => {
  let teardownSpy: ReturnType<typeof vi.fn>;
  let controller: PromptOptimizerController;

  beforeEach(() => {
    teardownSpy = vi.fn();
    vi.clearAllMocks();
    controller = new PromptOptimizerController();
    (workflow.executeAst as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Observable(() => () => (teardownSpy as unknown as () => void)()),
    );
  });

  it('客户端在 useEntityManager 解析前断开（unsubscribe），内层工作流订阅被拆除', async () => {
    const obs = controller.executeTask('task-1');
    const sub = obs.subscribe({ next: () => {}, error: () => {} });

    // 模拟 req.on('close')：外层 unsubscribe
    sub.unsubscribe();

    // 让 useEntityManager 的异步回调执行完
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(teardownSpy).toHaveBeenCalled();
  });
});
