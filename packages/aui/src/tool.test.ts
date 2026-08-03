import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuiStore } from './store';
import { AuiToolExecutor, createToolExecutor } from './tool';
import type { ToolDefinition } from './types';

describe('AuiToolExecutor', () => {
  let store: AuiStore;
  let executor: AuiToolExecutor;

  beforeEach(() => {
    store = new AuiStore();
    executor = new AuiToolExecutor(store);
  });

  it('getTools 只返回带 tool 属性的根节点', () => {
    const tool: ToolDefinition = { name: 'submit', handler: () => 'ok' };
    store.registerNode({ id: 'a', type: 'Button', props: { tool } });
    store.registerNode({ id: 'b', type: 'Button', props: { label: '无工具' } });
    expect(executor.getTools()).toEqual([{ nodeId: 'a', tool }]);
  });

  it('execute 节点不存在返回错误', async () => {
    expect(await executor.execute('nope', {})).toEqual({
      success: false,
      error: 'Tool not found: nope',
    });
  });

  it('execute 节点没有 tool 属性返回错误', async () => {
    store.registerNode({ id: 'a', type: 'Button' });
    const result = await executor.execute('a', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Tool not found: a');
  });

  it('execute 校验必填参数', async () => {
    const tool: ToolDefinition = {
      name: 't',
      parameters: [{ name: 'id', type: 'string', required: true }],
      handler: () => 'ok',
    };
    store.registerNode({ id: 'a', type: 'Button', props: { tool } });
    expect(await executor.execute('a', {})).toEqual({
      success: false,
      error: 'Missing required parameter: id',
    });
  });

  it('execute 调用 handler 并返回数据', async () => {
    const handler = vi.fn((params: Record<string, unknown>) => `got ${params.id}`);
    const tool: ToolDefinition = { name: 't', parameters: [{ name: 'id', type: 'string' }], handler };
    store.registerNode({ id: 'a', type: 'Button', props: { tool } });
    const result = await executor.execute('a', { id: 'x' });
    expect(handler).toHaveBeenCalledWith({ id: 'x' });
    expect(result).toEqual({ success: true, data: 'got x' });
  });

  it('execute 必填参数之外的参数可省略', async () => {
    const handler = vi.fn(() => 'ok');
    const tool: ToolDefinition = {
      name: 't',
      parameters: [{ name: 'a', type: 'string', required: true }],
      handler,
    };
    store.registerNode({ id: 'a', type: 'Button', props: { tool } });
    const result = await executor.execute('a', { a: '1' });
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledWith({ a: '1' });
  });

  it('execute handler 抛错返回错误结果', async () => {
    const tool: ToolDefinition = {
      name: 't',
      handler: () => {
        throw new Error('boom');
      },
    };
    store.registerNode({ id: 'a', type: 'Button', props: { tool } });
    const result = await executor.execute('a', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Error: boom');
  });

  it('execute 支持异步 handler', async () => {
    const tool: ToolDefinition = { name: 't', handler: async () => 'async result' };
    store.registerNode({ id: 'a', type: 'Button', props: { tool } });
    expect(await executor.execute('a', {})).toEqual({ success: true, data: 'async result' });
  });

  it('createToolExecutor 创建执行器', () => {
    expect(createToolExecutor(store)).toBeInstanceOf(AuiToolExecutor);
  });
});
