import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { createStore } from './index';
import { counterReducer, increment, decrement, add } from './runtime.fixtures';

describe('Store Runtime', () => {
  describe('createStore', () => {
    it('应该创建 Store 实例', () => {
      const store = createStore({ counter: counterReducer });
      expect(store).toBeDefined();
      expect(typeof store.dispatch).toBe('function');
      expect(typeof store.select).toBe('function');
    });

    it('应该使用初始状态', async () => {
      const store = createStore({ counter: counterReducer });
      const state = await firstValueFrom(store);

      expect(state.counter.count).toBe(0);
      expect(state.counter.lastAction).toBe('none');
    });

    it('应该支持自定义初始状态', async () => {
      const store = createStore(
        { counter: counterReducer },
        {
          initialState: {
            counter: { count: 10, lastAction: 'custom' },
          },
        }
      );

      const state = await firstValueFrom(store);
      expect(state.counter.count).toBe(10);
      expect(state.counter.lastAction).toBe('custom');
    });
  });

  describe('dispatch', () => {
    it('应该派发 Action 并更新状态', async () => {
      const store = createStore({ counter: counterReducer });

      store.dispatch(increment());

      const state = await firstValueFrom(store);
      expect(state.counter.count).toBe(1);
      expect(state.counter.lastAction).toBe('increment');
    });

    it('应该支持带 payload 的 Action', async () => {
      const store = createStore({ counter: counterReducer });

      store.dispatch(add({ value: 5 }));

      const state = await firstValueFrom(store);
      expect(state.counter.count).toBe(5);
      expect(state.counter.lastAction).toBe('add');
    });

    it('应该按顺序处理多个 Action', async () => {
      const store = createStore({ counter: counterReducer });

      store.dispatch(increment());
      store.dispatch(increment());
      store.dispatch(add({ value: 3 }));
      store.dispatch(decrement());

      const state = await firstValueFrom(store);
      expect(state.counter.count).toBe(4); // 0 + 1 + 1 + 3 - 1
    });

    it('应该抛出错误：派发函数而非对象', () => {
      const store = createStore({ counter: counterReducer });

      expect(() => {
        store.dispatch(increment as any);
      }).toThrow(/Dispatch expected an object/);
    });

    it('应该抛出错误：派发 undefined', () => {
      const store = createStore({ counter: counterReducer });

      expect(() => {
        store.dispatch(undefined as any);
      }).toThrow(/Actions must be objects/);
    });

    it('应该抛出错误：Action 缺少 type', () => {
      const store = createStore({ counter: counterReducer });

      expect(() => {
        store.dispatch({} as any);
      }).toThrow(/Actions must have a type property/);
    });
  });
});
