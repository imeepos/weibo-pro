import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, Observable } from 'rxjs';
import { root } from '@sker/core';
import type { Ast, WorkflowGraphAst } from '@sker/workflow';
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
