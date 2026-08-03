import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { createStore } from './index';
import {
  counterReducer,
  userReducer,
  increment,
  decrement,
  login,
} from './runtime.fixtures';

describe('Store Runtime', () => {
  describe('多 Feature 集成', () => {
    it('应该支持多个 Feature', async () => {
      const store = createStore({
        counter: counterReducer,
        user: userReducer,
      });

      store.dispatch(increment());
      store.dispatch(login({ name: 'Bob' }));

      const state = await firstValueFrom(store);

      expect(state.counter.count).toBe(1);
      expect(state.user.name).toBe('Bob');
      expect(state.user.loggedIn).toBe(true);
    });

    it('Feature 之间不应该相互影响', async () => {
      const store = createStore({
        counter: counterReducer,
        user: userReducer,
      });

      store.dispatch(increment());
      store.dispatch(increment());

      const state = await firstValueFrom(store);

      expect(state.counter.count).toBe(2);
      expect(state.user.loggedIn).toBe(false); // user 状态未变
    });
  });

  describe('动态 Reducer', () => {
    it('应该支持动态添加 Reducer', async () => {
      const store = createStore({ counter: counterReducer });

      // 动态添加 user reducer
      store.addReducer('user', userReducer);

      store.dispatch(login({ name: 'Charlie' }));

      const state = await firstValueFrom(store);

      expect((state as any).user?.name).toBe('Charlie');
    });

    it('应该支持动态移除 Reducer', async () => {
      const store = createStore({
        counter: counterReducer,
        user: userReducer,
      });

      store.dispatch(login({ name: 'David' }));

      // 移除 user reducer
      store.removeReducer('user');

      const state = await firstValueFrom(store);

      expect((state as any).user).toBeUndefined();
    });
  });

  describe('MetaReducer', () => {
    it('应该支持 MetaReducer（日志记录）', async () => {
      const logs: string[] = [];

      const loggerMetaReducer = (reducer: any) => (state: any, action: any) => {
        logs.push(`[MetaReducer] ${action.type}`);
        return reducer(state, action);
      };

      const store = createStore(
        { counter: counterReducer },
        { metaReducers: [loggerMetaReducer] }
      );

      store.dispatch(increment());
      store.dispatch(increment());
      store.dispatch(decrement());

      await firstValueFrom(store);

      expect(logs).toContain('[MetaReducer] [Counter] Increment');
      expect(logs).toContain('[MetaReducer] [Counter] Decrement');
    });

    it('应该支持多个 MetaReducer（按顺序执行）', async () => {
      const executionOrder: string[] = [];

      const metaA = (reducer: any) => (state: any, action: any) => {
        executionOrder.push('A');
        return reducer(state, action);
      };

      const metaB = (reducer: any) => (state: any, action: any) => {
        executionOrder.push('B');
        return reducer(state, action);
      };

      const store = createStore(
        { counter: counterReducer },
        { metaReducers: [metaA, metaB] }
      );

      executionOrder.length = 0; // 清空初始化时的执行记录

      store.dispatch(increment());

      await firstValueFrom(store);

      expect(executionOrder).toEqual(['A', 'B']); // MetaReducer 按顺序执行
    });
  });
});
