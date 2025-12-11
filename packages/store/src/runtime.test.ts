import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom, take, toArray } from 'rxjs';
import {
  createStore,
  createAction,
  createReducer,
  on,
  props,
  createSelector,
} from './index';

/**
 * 运行时集成测试 - 验证完整的响应式状态管理流程
 */
describe('Store Runtime', () => {
  // Counter Feature
  interface CounterState {
    count: number;
    lastAction: string;
  }

  const increment = createAction('[Counter] Increment');
  const decrement = createAction('[Counter] Decrement');
  const add = createAction('[Counter] Add', props<{ value: number }>());
  const reset = createAction('[Counter] Reset');

  const counterInitialState: CounterState = {
    count: 0,
    lastAction: 'none',
  };

  const counterReducer = createReducer(
    counterInitialState,
    on(increment, (state) => ({
      ...state,
      count: state.count + 1,
      lastAction: 'increment',
    })),
    on(decrement, (state) => ({
      ...state,
      count: state.count - 1,
      lastAction: 'decrement',
    })),
    on(add, (state, { value }) => ({
      ...state,
      count: state.count + value,
      lastAction: 'add',
    })),
    on(reset, () => ({
      ...counterInitialState,
      lastAction: 'reset',
    }))
  );

  // User Feature
  interface UserState {
    name: string;
    loggedIn: boolean;
  }

  const login = createAction('[User] Login', props<{ name: string }>());
  const logout = createAction('[User] Logout');

  const userInitialState: UserState = {
    name: '',
    loggedIn: false,
  };

  const userReducer = createReducer(
    userInitialState,
    on(login, (state, { name }) => ({
      ...state,
      name,
      loggedIn: true,
    })),
    on(logout, () => userInitialState)
  );

  // Root State
  interface RootState {
    counter: CounterState;
    user: UserState;
  }

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

  describe('select', () => {
    let store: ReturnType<typeof createStore<RootState>>;

    beforeEach(() => {
      store = createStore({
        counter: counterReducer,
        user: userReducer,
      });
    });

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
