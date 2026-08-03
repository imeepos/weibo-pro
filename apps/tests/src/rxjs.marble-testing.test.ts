import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { map, filter, debounceTime, switchMap, delay } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { createTestScheduler } from './test-utils.js';

/**
 * Marble Testing（弹珠图测试）
 * 使用 TestScheduler 测试操作符的时间语义。
 * 共享的 TestScheduler 创建逻辑抽取在 ./test-utils.ts 的 createTestScheduler。
 */

// ==================== 5. Marble Testing ====================
describe('Marble Testing（弹珠图测试）', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = createTestScheduler();
  });

  it('同步值用括号表示：(abc|)', () => {
    testScheduler.run(({ expectObservable }) => {
      const source$ = of(1, 2, 3);
      const expected = '(abc|)';
      const values = { a: 1, b: 2, c: 3 };

      expectObservable(source$).toBe(expected, values);
    });
  });

  it('异步值用横线表示时间间隔', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c--|', { a: 1, b: 2, c: 3 });
      const expected =     '--a--b--c--|';
      const values = { a: 1, b: 2, c: 3 };

      expectObservable(source$).toBe(expected, values);
    });
  });

  it('测试 map() 操作符', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c--|', { a: 1, b: 2, c: 3 });
      const result$ = source$.pipe(map(x => x * 10));
      const expected =     '--a--b--c--|';
      const values = { a: 10, b: 20, c: 30 };

      expectObservable(result$).toBe(expected, values);
    });
  });

  it('测试 filter() 操作符', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--c--d--|', { a: 1, b: 2, c: 3, d: 4 });
      const result$ = source$.pipe(filter(x => x % 2 === 0));
      const expected =     '-----b-----d--|';
      const values = { b: 2, d: 4 };

      expectObservable(result$).toBe(expected, values);
    });
  });

  it('错误用 # 表示', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('--a--b--#', { a: 1, b: 2 }, new Error('测试错误'));
      const expected =     '--a--b--#';

      expectObservable(source$).toBe(expected, { a: 1, b: 2 }, new Error('测试错误'));
    });
  });

  it('测试 debounceTime() 防抖', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      // 使用更长的静默间隔来测试 debounce
      const source$ = cold('a---b---c---|');
      const result$ = source$.pipe(debounceTime(2));
      // debounceTime(2) 意味着只有在 2 帧静默后才发出
      const expected =     '--a---b---c-|';

      expectObservable(result$).toBe(expected);
    });
  });

  it('测试 switchMap() 切换流', () => {
    testScheduler.run(({ cold, hot, expectObservable }) => {
      const source$ = hot('  --a-----b--|');
      const inner$ = cold('    --x-y-z|');
      const result$ = source$.pipe(switchMap(() => inner$));
      const expected =       '----x-y---x-y-z|';

      expectObservable(result$).toBe(expected);
    });
  });

  it('测试 delay() 延迟', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const source$ = cold('a-b-c|');
      const result$ = source$.pipe(delay(3)); // 3 帧延迟
      // 源: a(0), b(2), c(4), |(5)
      // 延迟后: a(3), b(5), c(7), |(7) - complete 与最后一个值同步发出
      const expected =     '---a-b-(c|)';

      expectObservable(result$).toBe(expected);
    });
  });
});
