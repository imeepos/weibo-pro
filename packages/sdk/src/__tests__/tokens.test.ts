import { describe, it, expect } from 'vitest';
import { root } from '@sker/core';
import {
  BETTER_FETCH,
  BETTER_STORE,
  BETTER_OPTIONS,
  BETTER_FETCH_CONFIG,
} from '../tokens';

/**
 * 每个用例使用不同的 token，避免共享 root 注入器的实例缓存
 * 导致前一个用例 set 的值覆盖掉后一个用例。
 */
describe('sdk DI tokens', () => {
  it('BETTER_FETCH is a DI-injectable token', () => {
    const value = { name: 'mock-fetch' };
    root.set([{ provide: BETTER_FETCH, useValue: value }]);
    expect(root.get(BETTER_FETCH)).toBe(value);
  });

  it('BETTER_STORE is a DI-injectable token', () => {
    const value = { name: 'mock-store' };
    root.set([{ provide: BETTER_STORE, useValue: value }]);
    expect(root.get(BETTER_STORE)).toBe(value);
  });

  it('BETTER_OPTIONS is a DI-injectable token', () => {
    const value = { baseURL: 'http://localhost:8089' };
    root.set([{ provide: BETTER_OPTIONS, useValue: value }]);
    expect(root.get(BETTER_OPTIONS)).toBe(value);
  });

  it('BETTER_FETCH_CONFIG is a DI-injectable token', () => {
    const value = { baseURL: 'http://localhost:8089' };
    root.set([{ provide: BETTER_FETCH_CONFIG, useValue: value }]);
    expect(root.get(BETTER_FETCH_CONFIG)).toBe(value);
  });
});
