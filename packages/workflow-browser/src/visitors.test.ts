import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, Subject, Observable } from 'rxjs';
import { root } from '@sker/core';
import type { Ast, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { LastAst, PostNLPLooperAst } from '@sker/workflow-ast';
import { LastAstVisitor } from './LastAstVisitor.js';
import { PostNLPLooperAstVisitor } from './PostNLPLooperAstVisitor.js';
import { RemoteDefaultVisitor } from './RemoteDefaultVisitor.js';

vi.mock('@sker/sdk', () => {
  class WorkflowController {}
  class PostsController {}
  return { WorkflowController, PostsController };
});

import { PostsController, WorkflowController } from '@sker/sdk';

const ctx = {} as WorkflowGraphAst;
const mockController = { execute: vi.fn() };
const mockPostsController = { getPendingNLPPosts: vi.fn() };

// 在任何 root.get 之前注册 mock 提供者
root.set([
  { provide: WorkflowController, useValue: mockController },
  { provide: PostsController, useValue: mockPostsController },
]);

beforeEach(() => {
  mockController.execute.mockReset();
  mockPostsController.getPendingNLPPosts.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('LastAstVisitor', () => {
  it('keeps only the last value emitted on the input stream', async () => {
    const ast = new LastAst();
    ast.id = 'last-1';
    const visitor = new LastAstVisitor();

    const events = await collect(visitor.handler(ast, of({ input: 'v1' }, { input: 'v2' }), ctx));

    expect(events).toEqual([
      { type: 'node_runing', id: 'last-1' },
      { type: 'node_emit', id: 'last-1', data: { last: 'v2', emitCount: 1 } },
      { type: 'node_success', id: 'last-1' },
    ]);
    expect(ast.last).toBe('v2');
    expect(ast.emitCount).toBe(1);
    expect(ast.state).toBe('success');
  });

  it('uses the whole input object when no "input" key is present', async () => {
    const ast = new LastAst();
    ast.id = 'last-2';
    const visitor = new LastAstVisitor();

    const events = await collect(visitor.handler(ast, of({ foo: 'bar' }), ctx));

    expect(events).toEqual([
      { type: 'node_runing', id: 'last-2' },
      { type: 'node_emit', id: 'last-2', data: { last: { foo: 'bar' }, emitCount: 1 } },
      { type: 'node_success', id: 'last-2' },
    ]);
    expect(ast.last).toEqual({ foo: 'bar' });
  });

  it('completes with node_success when the input stream is empty', async () => {
    const ast = new LastAst();
    ast.id = 'last-3';
    const visitor = new LastAstVisitor();

    const events = await collect(visitor.handler(ast, of(), ctx));

    expect(events).toEqual([
      { type: 'node_runing', id: 'last-3' },
      { type: 'node_success', id: 'last-3' },
    ]);
    expect(ast.last).toBeNull();
    expect(ast.state).toBe('success');
  });

  it('marks the node failed when the input stream errors', async () => {
    const ast = new LastAst();
    ast.id = 'last-4';
    const visitor = new LastAstVisitor();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const events = await collect(
      visitor.handler(ast, new Observable((sub) => sub.error(new Error('boom'))), ctx)
    );

    expect(events).toEqual([
      { type: 'node_runing', id: 'last-4' },
      { type: 'node_fail', id: 'last-4', error: 'boom' },
    ]);
    expect(ast.state).toBe('fail');
    expect(ast.error).toBeDefined();
    errorSpy.mockRestore();
  });
});

describe('PostNLPLooperAstVisitor', () => {
  it('emits each post and succeeds when no cursor is returned', async () => {
    mockPostsController.getPendingNLPPosts.mockResolvedValue({
      posts: [
        { id: 'p1', event_id: 'e1', ingested_at: '2026-08-03T00:00:00Z' },
        { id: 'p2', event_id: 'e2', ingested_at: '2026-08-03T00:00:01Z' },
      ],
      hasMore: false,
      cursor: null,
    });

    const ast = new PostNLPLooperAst();
    ast.id = 'looper-1';
    const visitor = new PostNLPLooperAstVisitor();
    const input$ = new Subject<Record<string, unknown>>();

    const promise = collect(visitor.visit(ast, input$, ctx));
    input$.next({});
    input$.complete();
    const events = await promise;

    expect(events).toEqual([
      { type: 'node_runing', id: 'looper-1' },
      { type: 'node_emit', id: 'looper-1', data: { postId: 'p1', event_id: 'e1', emitCount: 1 } },
      { type: 'node_emit', id: 'looper-1', data: { postId: 'p2', event_id: 'e2', emitCount: 2 } },
      { type: 'node_success', id: 'looper-1' },
    ]);
    expect(mockPostsController.getPendingNLPPosts).toHaveBeenCalledWith(undefined, 10);
    expect(ast.state).toBe('success');
  });

  it('updates the output cursor when the API returns a cursor (hasMore=false)', async () => {
    mockPostsController.getPendingNLPPosts.mockResolvedValue({
      posts: [{ id: 'p1', event_id: 'e1', ingested_at: '2026-08-03T00:00:00Z' }],
      hasMore: false,
      cursor: '1720000000000',
    });

    const ast = new PostNLPLooperAst();
    ast.id = 'looper-2';
    const visitor = new PostNLPLooperAstVisitor();
    const input$ = new Subject<Record<string, unknown>>();

    const promise = collect(visitor.visit(ast, input$, ctx));
    input$.next({});
    input$.complete();
    const events = await promise;

    expect(events).toEqual([
      { type: 'node_runing', id: 'looper-2' },
      { type: 'node_emit', id: 'looper-2', data: { postId: 'p1', event_id: 'e1', emitCount: 1 } },
      { type: 'node_success', id: 'looper-2' },
    ]);
    expect(ast.outputCursor).toBe('1720000000000');
    expect(ast.hasMore).toBe(false);
  });

  it('copies input fields onto the ast and passes cursor/pageSize to the API', async () => {
    mockPostsController.getPendingNLPPosts.mockResolvedValue({
      posts: [],
      hasMore: false,
      cursor: null,
    });

    const ast = new PostNLPLooperAst();
    ast.id = 'looper-3';
    ast.inputCursor = 'cur-9';
    const visitor = new PostNLPLooperAstVisitor();
    const input$ = new Subject<Record<string, unknown>>();

    const promise = collect(visitor.visit(ast, input$, ctx));
    input$.next({ pageSize: 5 });
    input$.complete();
    await promise;

    expect(ast.pageSize).toBe(5);
    expect(mockPostsController.getPendingNLPPosts).toHaveBeenCalledWith('cur-9', 5);
  });

  it('stays alive and emits hasMore metadata when the API returns hasMore=true', async () => {
    vi.useFakeTimers();
    try {
      mockPostsController.getPendingNLPPosts.mockResolvedValue({
        posts: [{ id: 'p1', event_id: 'e1', ingested_at: '2026-08-03T00:00:00Z' }],
        hasMore: true,
        cursor: '1720000000000',
      });

      const ast = new PostNLPLooperAst();
      ast.id = 'looper-4';
      const visitor = new PostNLPLooperAstVisitor();
      const input$ = new Subject<Record<string, unknown>>();
      const received: NodeEvent[] = [];

      const subscription = visitor.visit(ast, input$, ctx).subscribe((e) => received.push(e));
      input$.next({});
      await vi.advanceTimersByTimeAsync(1100);

      // hasMore=true 时不立即 complete，等待下一次输入
      expect(received).toEqual([
        { type: 'node_runing', id: 'looper-4' },
        { type: 'node_emit', id: 'looper-4', data: { postId: 'p1', event_id: 'e1', emitCount: 1 } },
        { type: 'node_emit', id: 'looper-4', data: { hasMore: true, outputCursor: '1720000000000', emitCount: 2 } },
      ]);
      expect(ast.state).toBe('running');

      // 输入流结束后才完成
      input$.complete();
      await vi.advanceTimersByTimeAsync(0);
      expect(received[received.length - 1]).toEqual({ type: 'node_success', id: 'looper-4' });
      expect(ast.state).toBe('success');

      subscription.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('RemoteDefaultVisitor', () => {
  it('delegates to handlerRemote and forwards remote events', async () => {
    const ast = { id: 'node-1', type: 'TestAst', state: 'pending', error: undefined } as unknown as Ast;
    mockController.execute.mockReturnValue(
      of({ type: 'node_emit', id: 'node-1', data: { x: 1 } })
    );
    const visitor = new RemoteDefaultVisitor();

    const events = await collect(visitor.visit(ast, of({ a: 1 }), ctx));

    expect(events).toEqual([
      { type: 'node_runing', id: 'node-1' },
      { type: 'node_emit', id: 'node-1', data: { x: 1 } },
      { type: 'node_success', id: 'node-1' },
    ]);
    expect(mockController.execute).toHaveBeenCalledTimes(1);
    expect(ast.state).toBe('success');
  });
});
