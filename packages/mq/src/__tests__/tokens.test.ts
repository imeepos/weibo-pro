import { describe, it, expect, vi, beforeEach } from 'vitest';

// registerMqQueueConfig 是全局副作用（写入 @sker/core 的 root 单例容器）。
// 通过 vi.resetModules() + 动态 import 让每个用例拿到全新的 tokens 模块与全新的 root 容器，
// 避免用例间污染。
describe('tokens', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadTokens() {
    return await import('../tokens.js');
  }

  it('未注册任何配置时返回默认配置（queue + dlq）', async () => {
    const { getMqQueueConfig } = await loadTokens();

    const cfg = getMqQueueConfig('my_queue');

    expect(cfg).toEqual({
      queue: 'my_queue',
      dlq: 'my_queue.dlq',
    });
  });

  it('getMqQueueConfigs 未注册时返回空数组', async () => {
    const { getMqQueueConfigs } = await loadTokens();

    expect(getMqQueueConfigs()).toEqual([]);
  });

  it('registerMqQueueConfig 后 getMqQueueConfig 能取到注册配置', async () => {
    const mod = await loadTokens();

    mod.registerMqQueueConfig({
      queue: 'orders',
      dlq: 'orders_failed',
      queueOptions: { durable: true, messageTtl: 1000 },
    });

    const cfg = mod.getMqQueueConfig('orders');

    expect(cfg.queue).toBe('orders');
    expect(cfg.dlq).toBe('orders_failed');
    expect(cfg.queueOptions).toEqual({ durable: true, messageTtl: 1000 });
  });

  it('getMqQueueConfigs 返回所有注册的配置', async () => {
    const mod = await loadTokens();

    mod.registerMqQueueConfig({ queue: 'a', dlq: 'a.dlq' });
    mod.registerMqQueueConfig({ queue: 'b', dlq: 'b.dlq' });

    expect(mod.getMqQueueConfigs().map(c => c.queue)).toEqual(['a', 'b']);
  });

  it('已注册其他队列时，未注册的队列名仍返回默认配置', async () => {
    const mod = await loadTokens();

    mod.registerMqQueueConfig({ queue: 'a', dlq: 'a.dlq' });

    const cfg = mod.getMqQueueConfig('unknown');

    expect(cfg).toEqual({ queue: 'unknown', dlq: 'unknown.dlq' });
  });

  it('重复注册同一队列时，先注册的生效（getMqQueueConfig 使用 find 取首个匹配）', async () => {
    const mod = await loadTokens();

    mod.registerMqQueueConfig({ queue: 'a', dlq: 'a-v1.dlq' });
    mod.registerMqQueueConfig({ queue: 'a', dlq: 'a-v2.dlq' });

    const cfg = mod.getMqQueueConfig('a');

    expect(cfg.dlq).toBe('a-v1.dlq');
    expect(mod.getMqQueueConfigs()).toHaveLength(2);
  });
});
