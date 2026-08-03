import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { createStore, createSelector } from './index';
import {
  counterReducer,
  userReducer,
  increment,
  add,
  reset,
  login,
  type RootState,
} from './runtime.fixtures';

describe('Store Runtime', () => {
  let store: ReturnType<typeof createStore<RootState>>;

  beforeEach(() => {
    store = createStore({
      counter: counterReducer,
      user: userReducer,
    });
  });

  describe('select', () => {
    it('应该通过函数选择器选择状态', async () => {
      store.dispatch(increment());

      const count = await firstValueFrom(
        store.select((state) => state.counter.count)
      );

      expect(count).toBe(1);
    });

    it('应该通过键路径选择状态', async () => {
      store.dispatch(login({ name: 'Alice' }));

      const name = await firstValueFrom(store.select('user', 'name'));

      expect(name).toBe('Alice');
    });

    it('应该支持 createSelector', async () => {
      const selectCounter = (state: RootState) => state.counter;
      const selectCount = createSelector(
        selectCounter,
        (counter) => counter.count
      );

      store.dispatch(add({ value: 7 }));

      const count = await firstValueFrom(store.select(selectCount));

      expect(count).toBe(7);
    });

    it('应该自动去重相同的值', async () => {
      const values: number[] = [];
      const subscription = store
        .select((state) => state.counter.count)
        .subscribe((count) => values.push(count));

      store.dispatch(increment()); // count = 1
      store.dispatch(reset());      // count = 0
      store.dispatch(reset());      // count = 0（重复，会被去重）

      await new Promise((resolve) => setTimeout(resolve, 50));
      subscription.unsubscribe();

      expect(values).toEqual([0, 1, 0]); // 去重后只有 3 个值
    });
  });

  describe('订阅与取消订阅', () => {
    it('应该支持订阅状态变更', async () => {
      const store = createStore({ counter: counterReducer });
      const states: number[] = [];

      const subscription = store
        .select((state) => state.counter.count)
        .subscribe((count) => states.push(count));

      store.dispatch(increment());
      store.dispatch(increment());
      store.dispatch(reset());

      await new Promise((resolve) => setTimeout(resolve, 50));

      subscription.unsubscribe();

      expect(states).toEqual([0, 1, 2, 0]);
    });

    it('取消订阅后不应该收到新值', async () => {
      const store = createStore({ counter: counterReducer });
      const states: number[] = [];

      const subscription = store
        .select((state) => state.counter.count)
        .subscribe((count) => states.push(count));

      store.dispatch(increment());

      subscription.unsubscribe();

      store.dispatch(increment());
      store.dispatch(increment());

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(states).toEqual([0, 1]); // 取消订阅后不再收到
    });
  });
});
