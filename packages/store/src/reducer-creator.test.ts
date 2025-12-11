import { describe, it, expect } from 'vitest';
import { createReducer, on } from './reducer-creator';
import { createAction, props } from './action-creator';

describe('reducer-creator', () => {
  interface CounterState {
    count: number;
  }

  interface UserState {
    name: string;
    age: number;
  }

  describe('on', () => {
    it('返回包含 reducer 和 types 的对象', () => {
      const increment = createAction('[Counter] Increment');
      const result = on(increment, (state: CounterState) => ({
        ...state,
        count: state.count + 1,
      }));

      expect(result).toHaveProperty('reducer');
      expect(result).toHaveProperty('types');
      expect(result.types).toEqual(['[Counter] Increment']);
      expect(typeof result.reducer).toBe('function');
    });

    it('支持多个 action creators', () => {
      const increment = createAction('[Counter] Increment');
      const decrement = createAction('[Counter] Decrement');
      const result = on(increment, decrement, (state: CounterState) => state);

      expect(result.types).toEqual(['[Counter] Increment', '[Counter] Decrement']);
    });
  });

  describe('createReducer', () => {
    it('创建基本 reducer', () => {
      const initialState: CounterState = { count: 0 };
      const increment = createAction('[Counter] Increment');

      const reducer = createReducer(
        initialState,
        on(increment, (state) => ({ count: state.count + 1 }))
      );

      const newState = reducer(undefined, increment());
      expect(newState).toEqual({ count: 1 });
    });

    it('处理多个 actions', () => {
      const initialState: CounterState = { count: 0 };
      const increment = createAction('[Counter] Increment');
      const decrement = createAction('[Counter] Decrement');
      const reset = createAction('[Counter] Reset');

      const reducer = createReducer(
        initialState,
        on(increment, (state) => ({ count: state.count + 1 })),
        on(decrement, (state) => ({ count: state.count - 1 })),
        on(reset, () => ({ count: 0 }))
      );

      let state = reducer(undefined, increment());
      expect(state.count).toBe(1);

      state = reducer(state, increment());
      expect(state.count).toBe(2);

      state = reducer(state, decrement());
      expect(state.count).toBe(1);

      state = reducer(state, reset());
      expect(state.count).toBe(0);
    });

    it('处理带 props 的 actions', () => {
      const initialState: CounterState = { count: 0 };
      const add = createAction('[Counter] Add', props<{ value: number }>());

      const reducer = createReducer(
        initialState,
        on(add, (state, { value }) => ({ count: state.count + value }))
      );

      const newState = reducer(undefined, add({ value: 5 }));
      expect(newState).toEqual({ count: 5 });
    });

    it('未知 action 返回当前状态', () => {
      const initialState: CounterState = { count: 10 };
      const increment = createAction('[Counter] Increment');
      const unknown = createAction('[Unknown] Action');

      const reducer = createReducer(
        initialState,
        on(increment, (state) => ({ count: state.count + 1 }))
      );

      const state = { count: 10 };
      const newState = reducer(state, unknown());
      expect(newState).toBe(state);
    });

    it('支持复杂状态结构', () => {
      const initialState: UserState = { name: '', age: 0 };
      const setName = createAction('[User] Set Name', props<{ name: string }>());
      const setAge = createAction('[User] Set Age', props<{ age: number }>());

      const reducer = createReducer(
        initialState,
        on(setName, (state, { name }) => ({ ...state, name })),
        on(setAge, (state, { age }) => ({ ...state, age }))
      );

      let state = reducer(undefined, setName({ name: 'Alice' }));
      expect(state).toEqual({ name: 'Alice', age: 0 });

      state = reducer(state, setAge({ age: 30 }));
      expect(state).toEqual({ name: 'Alice', age: 30 });
    });

    it('多个 on() 绑定同一 action 会链式执行', () => {
      const initialState: CounterState = { count: 0 };
      const increment = createAction('[Counter] Increment');

      const reducer = createReducer(
        initialState,
        on(increment, (state) => ({ count: state.count + 1 })),
        on(increment, (state) => ({ count: state.count * 2 }))
      );

      // 先 +1 再 *2
      const newState = reducer(undefined, increment());
      expect(newState.count).toBe(2);
    });

    it('使用 undefined state 时应用初始状态', () => {
      const initialState: CounterState = { count: 42 };
      const noop = createAction('[Test] Noop');

      const reducer = createReducer(
        initialState,
        on(noop, (state) => state)
      );

      const newState = reducer(undefined, noop());
      expect(newState).toEqual({ count: 42 });
    });
  });
});
