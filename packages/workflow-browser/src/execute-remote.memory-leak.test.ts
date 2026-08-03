import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, Subject } from 'rxjs';
import { root } from '@sker/core';
import type { Ast, WorkflowGraphAst } from '@sker/workflow';

vi.mock('@sker/sdk', () => {
  class WorkflowController {}
  class PostsController {}
  return { WorkflowController, PostsController };
});

import { WorkflowController } from '@sker/sdk';
import { handlerRemote } from './execute-remote.js';

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

/**
 * 内存泄漏回归测试：handlerRemote 中
 * `new Observable(obs => { ... $input.pipe(...).subscribe({...}) ... })` 缺少 teardown。
 *
 * 泄漏路径（已审计实证）：
 * - 前端 run 被取消时内层 $input 订阅与远程执行流残留。
 * - $input.pipe(...).subscribe(...) 的返回值被丢弃，外层退订无法拆除内层订阅。
 *
 * 修复：存储 subscribe 返回值，并在 Observable teardown 中 unsubscribe。
 */
describe('handlerRemote - 缺失 teardown 修复', () => {
  it('外层退订后应拆除对 $input 的内部订阅', () => {
    const ast = makeAst();
    mockController.execute.mockReturnValue(of({ type: 'node_success', id: 'node-1' }));
    const input$ = new Subject<Record<string, unknown>>();

    const output$ = handlerRemote(ast, input$, ctx);
    const sub = output$.subscribe({ next: () => {} });

    // 内部已订阅 $input
    expect(input$.observed).toBe(true);

    // 退订外层（模拟前端 run 被取消）
    sub.unsubscribe();

    // 修复前：缺少 teardown，内层订阅残留 → observed 仍为 true（红）
    // 修复后：teardown 拆除内层订阅 → observed 为 false（绿）
    expect(input$.observed).toBe(false);
  });
});
