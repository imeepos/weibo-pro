import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSelector,
  createFeatureSelector,
  createSelectorFactory,
  defaultMemoize,
  resultMemoize,
  setNgrxMockEnvironment,
  isNgrxMockEnvironment,
  isEqualCheck,
} from './selector';

describe('selector', () => {
  interface State {
    counter: { count: number };
    user: { name: string; age: number };
  }

  const mockState: State = {
    counter: { count: 10 },
    user: { name: 'Alice', age: 30 },
  };

  describe('defaultMemoize', () => {
    it('记忆化函数调用', () => {
      let callCount = 0;
      const fn = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoized = defaultMemoize(fn);

      const result1 = memoized.memoized(1, 2);
      expect(result1).toBe(3);
      expect(callCount).toBe(1);

      const result2 = memoized.memoized(1, 2);
      expect(result2).toBe(3);
      expect(callCount).toBe(1); // 未增加，使用了缓存
    });

    it('参数变化时重新计算', () => {
      let callCount = 0;
      const fn = (a: number) => {
        callCount++;
        return a * 2;
      };

      const memoized = defaultMemoize(fn);

      memoized.memoized(5);
      expect(callCount).toBe(1);

      memoized.memoized(10);
      expect(callCount).toBe(2);
    });

    it('reset() 清空缓存', () => {
      let callCount = 0;
      const fn = (a: number) => {
        callCount++;
        return a * 2;
      };

      const memoized = defaultMemoize(fn);

      memoized.memoized(5);
      expect(callCount).toBe(1);

      memoized.reset();

      memoized.memoized(5);
      expect(callCount).toBe(2); // 重新计算
    });

    it('setResult() 设置覆盖结果', () => {
      const fn = (a: number) => a * 2;
      const memoized = defaultMemoize(fn);

      memoized.setResult(999);
      const result = memoized.memoized(5);
      expect(result).toBe(999);
    });

    it('clearResult() 清除覆盖结果', () => {
      const fn = (a: number) => a * 2;
      const memoized = defaultMemoize(fn);

      memoized.setResult(999);
      expect(memoized.memoized(5)).toBe(999);

      memoized.clearResult();
      expect(memoized.memoized(5)).toBe(10);
    });
  });

  describe('createSelector', () => {
    it('创建基本选择器', () => {
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => count * 2);

      const result = selectDouble(mockState);
      expect(result).toBe(20);
    });

    it('组合多个输入选择器', () => {
      const selectCount = (state: State) => state.counter.count;
      const selectAge = (state: State) => state.user.age;
      const selectSum = createSelector(
        selectCount,
        selectAge,
        (count, age) => count + age
      );

      const result = selectSum(mockState);
      expect(result).toBe(40);
    });

    it('记忆化选择器结果', () => {
      let projectorCallCount = 0;
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => {
        projectorCallCount++;
        return count * 2;
      });

      const result1 = selectDouble(mockState);
      expect(projectorCallCount).toBe(1);

      const result2 = selectDouble(mockState);
      expect(projectorCallCount).toBe(1); // 未增加，使用了缓存
      expect(result1).toBe(result2);
    });

    it('输入变化时重新计算', () => {
      let projectorCallCount = 0;
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => {
        projectorCallCount++;
        return count * 2;
      });

      selectDouble(mockState);
      expect(projectorCallCount).toBe(1);

      const newState = { ...mockState, counter: { count: 20 } };
      selectDouble(newState);
      expect(projectorCallCount).toBe(2);
    });

    it('projector 属性可访问', () => {
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => count * 2);

      expect(typeof selectDouble.projector).toBe('function');
      expect(selectDouble.projector(5)).toBe(10);
    });

    it('release() 重置选择器状态', () => {
      let projectorCallCount = 0;
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => {
        projectorCallCount++;
        return count * 2;
      });

      selectDouble(mockState);
      expect(projectorCallCount).toBe(1);

      selectDouble.release();

      selectDouble(mockState);
      expect(projectorCallCount).toBe(2); // 重新计算
    });

    it('setResult() 设置固定结果', () => {
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => count * 2);

      selectDouble.setResult(999);
      expect(selectDouble(mockState)).toBe(999);
    });

    it('clearResult() 清除固定结果', () => {
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => count * 2);

      selectDouble.setResult(999);
      expect(selectDouble(mockState)).toBe(999);

      selectDouble.clearResult();
      expect(selectDouble(mockState)).toBe(20);
    });

    it('支持嵌套选择器', () => {
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = createSelector(selectCount, (count) => count * 2);
      const selectQuadruple = createSelector(
        selectDouble,
        (double) => double * 2
      );

      expect(selectQuadruple(mockState)).toBe(40);
    });
  });

  describe('createFeatureSelector', () => {
    it('创建 feature 选择器', () => {
      const selectCounter = createFeatureSelector<State['counter']>('counter');
      const result = selectCounter(mockState);

      expect(result).toEqual({ count: 10 });
    });

    it('可与 createSelector 组合', () => {
      const selectCounter = createFeatureSelector<State['counter']>('counter');
      const selectCount = createSelector(
        selectCounter,
        (counter) => counter.count
      );

      expect(selectCount(mockState)).toBe(10);
    });
  });

  describe('createSelectorFactory', () => {
    it('创建自定义记忆化选择器', () => {
      let memoizeCallCount = 0;
      const customMemoize = (fn: any) => {
        memoizeCallCount++;
        return defaultMemoize(fn);
      };

      const factory = createSelectorFactory(customMemoize);
      const selectCount = (state: State) => state.counter.count;
      const selectDouble = factory(selectCount, (count: number) => count * 2);

      expect(memoizeCallCount).toBe(1);
      expect(selectDouble(mockState)).toBe(20);
    });
  });

  describe('resultMemoize', () => {
    it('使用结果相等性进行记忆化', () => {
      let callCount = 0;
      const fn = (arr: number[]) => {
        callCount++;
        return arr.map((x) => x * 2);
      };

      const memoized = resultMemoize(fn, (a, b) => {
        return JSON.stringify(a) === JSON.stringify(b);
      });

      const result1 = memoized.memoized([1, 2, 3]);
      expect(callCount).toBe(1);

      const result2 = memoized.memoized([1, 2, 3]);
      expect(callCount).toBe(2); // 参数引用变了，重新计算

      // 但如果结果相同，仍返回旧引用
      expect(result2).toBe(result1);
    });
  });

  describe('Mock 环境', () => {
    afterEach(() => {
      setNgrxMockEnvironment(false);
    });

    it('setNgrxMockEnvironment 设置 mock 模式', () => {
      expect(isNgrxMockEnvironment()).toBe(false);

      setNgrxMockEnvironment(true);
      expect(isNgrxMockEnvironment()).toBe(true);

      setNgrxMockEnvironment(false);
      expect(isNgrxMockEnvironment()).toBe(false);
    });
  });

  describe('isEqualCheck', () => {
    it('严格相等检查', () => {
      expect(isEqualCheck(1, 1)).toBe(true);
      expect(isEqualCheck('a', 'a')).toBe(true);
      expect(isEqualCheck(null, null)).toBe(true);

      const obj = {};
      expect(isEqualCheck(obj, obj)).toBe(true);

      expect(isEqualCheck(1, 2)).toBe(false);
      expect(isEqualCheck({}, {})).toBe(false);
    });
  });
});
