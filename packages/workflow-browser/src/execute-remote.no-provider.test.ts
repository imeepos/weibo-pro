import { describe, it, expect, vi } from 'vitest';
import { root } from '@sker/core';
import type { Ast, WorkflowGraphAst } from '@sker/workflow';

vi.mock('@sker/sdk', () => {
  class WorkflowController {}
  class PostsController {}
  return { WorkflowController, PostsController };
});

import { WorkflowController } from '@sker/sdk';
import { executeRemote } from './execute-remote.js';

// 在独立模块注册表（独立 root 单例）中，WorkflowController 只有 useValue: undefined，
// 从而触发 executeRemote 的“未注入”守卫分支。
root.set([{ provide: WorkflowController, useValue: undefined as never }]);

const ctx = {} as WorkflowGraphAst;

describe('executeRemote without a WorkflowController provider', () => {
  it('throws synchronously when WorkflowController is not injected', () => {
    const ast = { id: 'node-1', type: 'TestAst', state: 'pending' } as unknown as Ast;

    expect(() => executeRemote(ast, ctx, {})).toThrow('WorkflowController 未注入');
  });
});
