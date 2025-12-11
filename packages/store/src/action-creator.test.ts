import { describe, it, expect, beforeEach } from 'vitest';
import { createAction, props, union, getRegisteredActionTypes } from './action-creator';

describe('action-creator', () => {
  describe('createAction', () => {
    it('创建无参数 action', () => {
      const increment = createAction('[Counter] Increment');
      const action = increment();

      expect(action).toEqual({ type: '[Counter] Increment' });
      expect(increment.type).toBe('[Counter] Increment');
    });

    it('创建带 props 的 action', () => {
      const addUser = createAction(
        '[User] Add',
        props<{ name: string; age: number }>()
      );
      const action = addUser({ name: 'Alice', age: 30 });

      expect(action).toEqual({
        type: '[User] Add',
        name: 'Alice',
        age: 30,
      });
      expect(addUser.type).toBe('[User] Add');
    });

    it('创建带自定义 creator 的 action', () => {
      const setValue = createAction(
        '[App] Set Value',
        (value: number, multiplier: number) => ({
          result: value * multiplier,
        })
      );
      const action = setValue(5, 3);

      expect(action).toEqual({
        type: '[App] Set Value',
        result: 15,
      });
    });

    it('action type 属性不可修改', () => {
      const testAction = createAction('[Test] Action');

      expect(() => {
        (testAction as any).type = 'changed';
      }).toThrow();
    });

    it('注册 action 类型到全局注册表', () => {
      const uniqueType = `[Test] Unique ${Date.now()}`;
      createAction(uniqueType);

      const registered = getRegisteredActionTypes();
      expect(registered[uniqueType]).toBe(1);
    });

    it('重复创建同类型 action 会增加计数', () => {
      const duplicateType = `[Test] Duplicate ${Date.now()}`;
      createAction(duplicateType);
      createAction(duplicateType);
      createAction(duplicateType);

      const registered = getRegisteredActionTypes();
      expect(registered[duplicateType]).toBe(3);
    });
  });

  describe('props', () => {
    it('返回正确的 ActionCreatorProps', () => {
      const result = props<{ id: string }>();

      expect(result).toEqual({
        _as: 'props',
        _p: undefined,
      });
    });
  });

  describe('union', () => {
    it('用于类型推导（运行时返回 undefined）', () => {
      const action1 = createAction('[A] Action1');
      const action2 = createAction('[B] Action2', props<{ value: number }>());

      const actions = { action1, action2 };
      const result = union(actions);

      expect(result).toBeUndefined();
    });
  });

  describe('getRegisteredActionTypes', () => {
    it('返回所有已注册的 action 类型', () => {
      const type1 = `[Test] Type1 ${Date.now()}`;
      const type2 = `[Test] Type2 ${Date.now()}`;

      createAction(type1);
      createAction(type2);

      const registered = getRegisteredActionTypes();
      expect(registered[type1]).toBe(1);
      expect(registered[type2]).toBe(1);
    });

    it('返回的是注册表副本', () => {
      const registered1 = getRegisteredActionTypes();
      registered1['modified'] = 999;

      const registered2 = getRegisteredActionTypes();
      expect(registered2['modified']).toBeUndefined();
    });
  });
});
