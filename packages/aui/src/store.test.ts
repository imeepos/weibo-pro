import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuiStore } from './store';
import type { AuiNode } from './types';

describe('AuiStore', () => {
  let store: AuiStore;

  beforeEach(() => {
    store = new AuiStore();
  });

  it('初始状态为空', () => {
    expect(store.state.nodes.size).toBe(0);
    expect(store.state.rootIds).toEqual([]);
  });

  it('registerNode 注册根节点', () => {
    const node: AuiNode = { id: 'a', type: 'Button' };
    store.registerNode(node);
    expect(store.getNode('a')).toEqual(node);
    expect(store.getRootNodes()).toEqual([node]);
  });

  it('registerNode 带 parentId 时不会加入 rootIds', () => {
    const parent: AuiNode = { id: 'p', type: 'Form' };
    const child: AuiNode = { id: 'c', type: 'Input' };
    store.registerNode(parent);
    store.registerNode(child, 'p');
    expect(store.getRootNodes()).toEqual([parent]);
    expect(store.getNode('c')).toEqual(child);
  });

  it('重复注册相同 id 不会重复加入 rootIds', () => {
    const node: AuiNode = { id: 'a', type: 'Button' };
    store.registerNode(node);
    store.registerNode(node);
    expect(store.state.rootIds).toEqual(['a']);
  });

  it('unregisterNode 移除节点和对应 rootId', () => {
    const node: AuiNode = { id: 'a', type: 'Button' };
    store.registerNode(node);
    store.unregisterNode('a');
    expect(store.getNode('a')).toBeUndefined();
    expect(store.getRootNodes()).toEqual([]);
  });

  it('updateNode 更新已有节点', () => {
    const node: AuiNode = { id: 'a', type: 'Button', props: { label: 'A' } };
    store.registerNode(node);
    store.updateNode('a', { props: { label: 'B' } });
    expect(store.getNode('a')?.props).toEqual({ label: 'B' });
  });

  it('updateNode 对不存在的节点是 no-op', () => {
    store.updateNode('nope', { type: 'Button' });
    expect(store.state.nodes.size).toBe(0);
    expect(store.state.rootIds).toEqual([]);
  });

  it('clear 重置状态', () => {
    store.registerNode({ id: 'a', type: 'Button' });
    store.clear();
    expect(store.state.nodes.size).toBe(0);
    expect(store.state.rootIds).toEqual([]);
  });

  it('state$ 在注册/注销时发出新状态', () => {
    const emissionIds: string[][] = [];
    const sub = store.state$.subscribe((s) => {
      emissionIds.push(s.rootIds);
    });
    store.registerNode({ id: 'a', type: 'Button' });
    store.registerNode({ id: 'b', type: 'Input' }, 'a');
    store.unregisterNode('a');
    // 初始 + 注册 a + 注册 b(挂到 a 下，不影响 rootIds) + 注销 a
    expect(emissionIds).toEqual([[], ['a'], ['a'], []]);
    sub.unsubscribe();
  });

  it('toContext 返回根节点、timestamp 和 metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-03T00:00:00.000Z'));
    store.registerNode({ id: 'a', type: 'Button' });
    const ctx = store.toContext({ page: 'home' });
    expect(ctx.nodes).toEqual([{ id: 'a', type: 'Button' }]);
    expect(ctx.timestamp).toBe(new Date('2026-08-03T00:00:00.000Z').getTime());
    expect(ctx.metadata).toEqual({ page: 'home' });
    vi.useRealTimers();
  });
});
