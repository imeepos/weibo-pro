import { describe, it, expect, vi } from 'vitest';
import { root } from '@sker/core';
import { DEFAULT_VISITOR, type IDefaultVisitor } from '@sker/workflow';

vi.mock('@sker/sdk', () => {
  class WorkflowController {}
  class PostsController {}
  return { WorkflowController, PostsController };
});

// 导入入口模块会触发自动注册副作用
import * as browser from './index.js';
import { RemoteDefaultVisitor } from './index.js';

describe('@sker/workflow-browser entry', () => {
  it('registers RemoteDefaultVisitor as the DEFAULT_VISITOR', () => {
    const visitor = root.get(DEFAULT_VISITOR) as unknown as IDefaultVisitor;

    expect(visitor).toBeInstanceOf(RemoteDefaultVisitor);
    expect(typeof visitor.visit).toBe('function');
  });

  it('exports the public API surface', () => {
    expect(typeof browser.RemoteDefaultVisitor).toBe('function');
    expect(typeof browser.executeRemote).toBe('function');
    expect(typeof browser.handlerRemote).toBe('function');
    expect(typeof browser.LastAstVisitor).toBe('function');
    expect(typeof browser.PostNLPLooperAstVisitor).toBe('function');
  });
});
