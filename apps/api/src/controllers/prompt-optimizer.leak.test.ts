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
    // findOne 用可控制的 promise：测试可决定"订阅启动前/后"断开的时机
    useEntityManager: vi.fn(async (fn: (m: unknown) => Promise<void>) => {
      let resolveFindOne!: (v: unknown) => void;
      const findOneDeferred = new Promise((res) => { resolveFindOne = res; });
      const manager = {
        findOne: vi.fn(() => findOneDeferred),
        save: vi.fn(),
      };
      const run = fn(manager);
      // 暴露 resolve 供测试触发
      (useEntityManager as unknown as { __resolve: () => void }).__resolve = () => resolveFindOne(new MockTask());
      await run;
    }),
    PromptOptimizationTaskEntity: class {},
    PromptVersionEntity: class {},
    OptimizationTaskStatus: { RUNNING: 'running' },
  };
});

import * as workflow from '@sker/workflow';
import { useEntityManager } from '@sker/entities';
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

  it('内层订阅启动后客户端断开（unsubscribe），内层工作流订阅被拆除', async () => {
    const obs = controller.executeTask('task-1');
    const sub = obs.subscribe({ next: () => {}, error: () => {} });

    // 触发 useEntityManager 的 findOne resolve，内层订阅启动
    await Promise.resolve();
    (useEntityManager as unknown as { __resolve: () => void }).__resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // 客户端断开（req.on('close')：外层 unsubscribe），内层 teardown 应被调用
    sub.unsubscribe();
    expect(teardownSpy).toHaveBeenCalled();
  });

  it('客户端在 useEntityManager 解析前断开时，不应启动内层工作流订阅（先启动再取消窗口）', async () => {
    const executeSpy = workflow.executeAst as unknown as ReturnType<typeof vi.fn>;

    const obs = controller.executeTask('task-1');
    const sub = obs.subscribe({ next: () => {}, error: () => {} });

    // 在 useEntityManager 异步回调完成前断开客户端连接
    sub.unsubscribe();

    // 触发 findOne resolve——此时 disposed 已为 true，
    // 若实现仍先 subscribe 再退订，executeAst 会被调用（LLM 优化任务已启动，副作用不可逆）
    await Promise.resolve();
    (useEntityManager as unknown as { __resolve: () => void }).__resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(executeSpy).not.toHaveBeenCalled();
  });
});
