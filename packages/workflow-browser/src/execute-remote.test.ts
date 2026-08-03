import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, throwError, from, Subject, ReplaySubject, Observable } from 'rxjs';
import { root } from '@sker/core';
import type { Ast, NodeEvent, WorkflowGraphAst } from '@sker/workflow';

vi.mock('@sker/sdk', () => {
  class WorkflowController {}
  class PostsController {}
  return { WorkflowController, PostsController };
});

import { WorkflowController } from '@sker/sdk';
import { executeRemote, handlerRemote } from './execute-remote.js';

/** 最小 AST 实例 */
function makeAst(): Ast {
  return {
    id: 'node-1',
    type: 'TestAst',
    state: 'pending',
    error: undefined,
    metadata: undefined,
  } as unknown as Ast;
}

/** 收集 Observable 的全部发射值与终态 */
function collect<T>(obs: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const out: T[] = [];
    obs.subscribe({
      next: (v) => out.push(v),
      error: reject,
      complete: () => resolve(out),
    });
  });
}

const mockController = { execute: vi.fn() };
const ctx = {} as WorkflowGraphAst;

// 在首个 root.get(WorkflowController) 之前注册 mock，避免真实类被实例化缓存
root.set([{ provide: WorkflowController, useValue: mockController }]);

beforeEach(() => {
  mockController.execute.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('executeRemote', () => {
  it('delegates to WorkflowController.execute with ast/workflow/input', async () => {
    const ast = makeAst();
    const input = { foo: 1 };
    mockController.execute.mockReturnValue(of({ type: 'node_success', id: 'node-1' }));

    await collect(executeRemote(ast, ctx, input));

    expect(mockController.execute).toHaveBeenCalledTimes(1);
    expect(mockController.execute).toHaveBeenCalledWith({ ast, workflow: ctx, input });
  });

  it('forwards node_emit events and syncs data onto the local ast', async () => {
    const ast = makeAst();
    mockController.execute.mockReturnValue(
      of({ type: 'node_emit', id: 'node-1', data: { result: 42, name: 'x' } })
    );

    const events = await collect(executeRemote(ast, ctx, {}));

    expect(events).toEqual([[{ type: 'node_emit', id: 'node-1', data: { result: 42, name: 'x' } }]]);
    expect((ast as unknown as Record<string, unknown>).result).toBe(42);
    expect((ast as unknown as Record<string, unknown>).name).toBe('x');
  });

  it('does not sync node_emit events that belong to other node ids', async () => {
    const ast = makeAst();
    mockController.execute.mockReturnValue(
      of({ type: 'node_emit', id: 'another-node', data: { result: 42 } })
    );

    const events = await collect(executeRemote(ast, ctx, {}));

    // map 透传所有 node_emit，但 tap 只同步匹配 id 的节点
    expect(events).toEqual([[{ type: 'node_emit', id: 'another-node', data: { result: 42 } }]]);
    expect((ast as unknown as Record<string, unknown>).result).toBeUndefined();
  });

  it('marks the local ast as fail and records the error on node_fail', async () => {
    const ast = makeAst();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockController.execute.mockReturnValue(
      of({ type: 'node_fail', id: 'node-1', error: 'boom' })
    );

    const events = await collect(executeRemote(ast, ctx, {}));

    expect(events).toEqual([[{ type: 'node_fail', id: 'node-1', error: 'boom' }]]);
    expect(ast.state).toBe('fail');
    expect(ast.error).toBeDefined();
    errorSpy.mockRestore();
  });

  it('lets node_emit/node_progress/node_delta pass through and filters everything else', async () => {
    const ast = makeAst();
    const sourceEvents: NodeEvent[] = [
      { type: 'node_progress', id: 'node-1', data: { round: 1 } },
      { type: 'node_delta', id: 'node-1', data: { delta: 'x' } },
      { type: 'node_success', id: 'node-1' },
      { type: 'node_runing', id: 'node-1' },
    ];
    mockController.execute.mockReturnValue(from(sourceEvents));

    const events = await collect(executeRemote(ast, ctx, {}));

    expect(events.flat()).toEqual([
      { type: 'node_progress', id: 'node-1', data: { round: 1 } },
      { type: 'node_delta', id: 'node-1', data: { delta: 'x' } },
    ]);
  });
});

describe('handlerRemote', () => {
  it('emits node_runing, syncs node_emit, then completes with node_success', async () => {
    const ast = makeAst();
    const input$ = new Subject<Record<string, unknown>>();
    mockController.execute.mockReturnValue(
      of({ type: 'node_emit', id: 'node-1', data: { result: 42 } })
    );

    const promise = collect(handlerRemote(ast, input$, ctx));
    input$.next({ a: 1 });
    input$.complete();

    const events = await promise;

    expect(events).toEqual([
      { type: 'node_runing', id: 'node-1' },
      { type: 'node_emit', id: 'node-1', data: { result: 42 } },
      { type: 'node_success', id: 'node-1' },
    ]);
    expect(ast.state).toBe('success');
    expect(ast.error).toBeUndefined();
    expect((ast as unknown as Record<string, unknown>).result).toBe(42);
  });

  it('propagates retryable errors: retries with a replaying input stream and recovers', async () => {
    const ast = makeAst();
    const input$ = new ReplaySubject<Record<string, unknown>>(1);
    mockController.execute
      .mockReturnValueOnce(throwError(() => new Error('ECONNRESET')))
      .mockReturnValueOnce(of({ type: 'node_emit', id: 'node-1', data: { result: 7 } }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const promise = collect(handlerRemote(ast, input$, ctx));
    input$.next({ a: 1 });
    input$.complete();

    const events = await promise;

    expect(mockController.execute).toHaveBeenCalledTimes(2);
    expect(events).toEqual([
      { type: 'node_runing', id: 'node-1' },
      { type: 'node_emit', id: 'node-1', data: { result: 7 } },
      { type: 'node_success', id: 'node-1' },
    ]);
    expect(ast.state).toBe('success');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('catches non-retryable errors into a node_fail event and leaves the node failed', async () => {
    const ast = makeAst();
    const input$ = new Subject<Record<string, unknown>>();
    mockController.execute.mockReturnValue(throwError(() => new Error('unauthorized')));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const promise = collect(handlerRemote(ast, input$, ctx));
    input$.next({ a: 1 });
    input$.complete();

    const events = await promise;

    expect(events).toEqual([
      { type: 'node_runing', id: 'node-1' },
      { type: 'node_fail', id: 'node-1', error: 'API 认证失败，请检查 API Key' },
    ]);
    // 失败后节点必须保持 fail 状态，且记录错误
    expect(ast.state).toBe('fail');
    expect(ast.error).toBeDefined();
    errorSpy.mockRestore();
  });

  it('completes with node_success when the input stream completes without emitting', async () => {
    const ast = makeAst();
    const input$ = new Subject<Record<string, unknown>>();
    mockController.execute.mockReturnValue(of({ type: 'node_success', id: 'node-1' }));

    const promise = collect(handlerRemote(ast, input$, ctx));
    input$.complete();

    const events = await promise;

    expect(events).toEqual([
      { type: 'node_runing', id: 'node-1' },
      { type: 'node_success', id: 'node-1' },
    ]);
    expect(ast.state).toBe('success');
  });
});
