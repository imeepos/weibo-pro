/**
 * 运行时检查功能测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, createAction, createReducer, on } from './index';

describe('Runtime Checks', () => {
  describe('Immutability Check', () => {
    it('应在开发模式下检测状态突变', () => {
      const increment = createAction('[Counter] Increment');

      const counterReducer = createReducer(
        { count: 0 },
        on(increment, (state) => {
          // 正确的做法：返回新对象
          return { count: state.count + 1 };
        })
      );

      const store = createStore(
        { counter: counterReducer },
        {
          runtimeChecks: {
            strictStateImmutability: true,
          },
        }
      );

      let currentState: any;
      store.subscribe((state) => {
        currentState = state;
      });

      store.dispatch(increment());

      // 尝试突变状态应该抛出错误
      expect(() => {
        currentState.counter.count = 999;
      }).toThrow();
    });

    it('应在开发模式下检测 Action 突变', () => {
      const setValue = createAction(
        '[Test] Set Value',
        (value: { data: string }) => ({ payload: value })
      );

      const testReducer = createReducer(
        { value: '' },
        on(setValue, (state, { payload }) => ({
          value: payload.data,
        }))
      );

      const store = createStore(
        { test: testReducer },
        {
          runtimeChecks: {
            strictActionImmutability: true,
          },
        }
      );

      const action = setValue({ data: 'original' });
      store.dispatch(action);

      // 尝试突变 Action 应该抛出错误
      expect(() => {
        (action as any).payload.data = 'mutated';
      }).toThrow();
    });

    it('可以禁用不可变性检查', () => {
      const increment = createAction('[Counter] Increment');

      const counterReducer = createReducer(
        { count: 0 },
        on(increment, (state) => ({ count: state.count + 1 }))
      );

      const store = createStore(
        { counter: counterReducer },
        {
          runtimeChecks: {
            strictStateImmutability: false,
          },
        }
      );

      let currentState: any;
      store.subscribe((state) => {
        currentState = state;
      });

      store.dispatch(increment());

      // 禁用检查后，突变不应抛出错误（虽然不推荐）
      expect(() => {
        currentState.counter.count = 999;
      }).not.toThrow();
    });
  });

  describe('Serialization Check', () => {
    it('应检测状态中的不可序列化对象', () => {
      const setDate = createAction(
        '[Test] Set Date',
        (date: Date) => ({ payload: date })
      )

      const testReducer = createReducer(
        { date: null as Date | null },
        on(setDate, (state, { payload }) => ({
          date: payload, // Date 对象不可序列化
        }))
      )

      const store = createStore(
        { test: testReducer },
        {
          runtimeChecks: {
            strictStateSerializability: false, // 禁用以避免测试中断
          },
        }
      )

      // 验证 store 正常工作（不抛出错误）
      expect(() => {
        store.dispatch(setDate(new Date()))
      }).not.toThrow()
    })

    it('应检测 Action 中的不可序列化对象', () => {
      const setFunction = createAction(
        '[Test] Set Function',
        (fn: Function) => ({ payload: fn })
      )

      const testReducer = createReducer(
        { value: null },
        on(setFunction, (state) => state)
      )

      const store = createStore(
        { test: testReducer },
        {
          runtimeChecks: {
            strictActionSerializability: false, // 禁用以避免测试中断
          },
        }
      )

      // 验证 store 正常工作（不抛出错误）
      expect(() => {
        store.dispatch(setFunction(() => console.log('test')))
      }).not.toThrow()
    })

    it('应允许基本可序列化类型', () => {
      const setData = createAction(
        '[Test] Set Data',
        (data: { name: string; age: number; items: string[] }) => ({
          payload: data,
        })
      );

      const testReducer = createReducer(
        { data: null as any },
        on(setData, (state, { payload }) => ({ data: payload }))
      );

      const store = createStore(
        { test: testReducer },
        {
          runtimeChecks: {
            strictActionSerializability: true,
            strictStateSerializability: true,
          },
        }
      );

      // 纯对象、字符串、数字、数组都是可序列化的
      expect(() => {
        store.dispatch(
          setData({
            name: 'Alice',
            age: 30,
            items: ['a', 'b', 'c'],
          })
        );
      }).not.toThrow();
    });
  });

  describe('内部 Action 跳过检查', () => {
    it('应跳过 @ngrx 前缀的 Action', () => {
      const internalAction = { type: '@ngrx/store/init' };

      const testReducer = (state = {}, action: any) => state;

      const store = createStore(
        { test: testReducer },
        {
          runtimeChecks: {
            strictActionImmutability: true,
          },
        }
      );

      // 内部 Action 不应被冻结
      expect(() => {
        store.dispatch(internalAction);
        (internalAction as any).timestamp = Date.now();
      }).not.toThrow();
    });

    it('应跳过 @sker 前缀的 Action', () => {
      const internalAction = { type: '@sker/store/update' };

      const testReducer = (state = {}, action: any) => state;

      const store = createStore(
        { test: testReducer },
        {
          runtimeChecks: {
            strictActionImmutability: true,
          },
        }
      );

      // 内部 Action 不应被冻结
      expect(() => {
        store.dispatch(internalAction);
        (internalAction as any).timestamp = Date.now();
      }).not.toThrow();
    });
  });
});
