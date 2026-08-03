import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { compile } from '@sker/workflow-compiler';
import { executeWorkflow, WorkflowGraphAst } from '@sker/workflow';
import { root } from '@sker/core';
import { WeiboLoginAst, LastAst } from '@sker/workflow-ast';
import { WeiboLoginAstVisitor } from '../WeiboLoginAstVisitor';
import { WeiboAuthService } from '../services/weibo-auth.service';
import { createMockAuthService, collectEvents } from '../test/helpers/workflow-link-test-utils';
import '../LastAstVisitor';

vi.mock('@sker/entities', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const mockManager = {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(null),
    query: vi.fn().mockResolvedValue([]),
    createQueryBuilder: () => ({ leftJoinAndSelect: () => ({} as never), where: () => ({} as never), andWhere: () => ({} as never), orderBy: () => ({} as never), getMany: vi.fn().mockResolvedValue([]) }),
  };
  return { ...actual, useEntityManager: vi.fn((cb: (m: typeof mockManager) => Promise<unknown>) => Promise.resolve(cb(mockManager))) };
});

describe('debug', () => {
  it('executeWorkflow dispatches to login visitor with mock auth', async () => {
    const mockAuthService = createMockAuthService();
    root.set([{ provide: WeiboAuthService, useValue: mockAuthService }]);

    const dsl = `
      workflow "微博登录链路" {
        node login {
          type: WeiboLoginAst
        }
        node last {
          type: LastAst
        }
        login.message -> last.input
      }
    `;
    const result = compile(dsl);
    expect(result.success).toBe(true);
    const workflow = result.workflowGraph!;

    // Check injected auth before execute
    const visitor = root.get(WeiboLoginAstVisitor);
    console.log('DBG auth === mock?', (visitor as any).authService === mockAuthService);
    expect((visitor as any).authService === mockAuthService).toBe(true);

    const events = await collectEvents(executeWorkflow(workflow, {}));
    console.log('DBG startLogin calls:', mockAuthService.startLogin.mock.calls.length);
    console.log('DBG event types:', events.map(e => e.type));
    expect(mockAuthService.startLogin).toHaveBeenCalledTimes(1);
  });
});
