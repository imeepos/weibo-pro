import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Observable,
  of,
  from,
  throwError,
  interval,
  Subject,
  BehaviorSubject,
  ReplaySubject,
  AsyncSubject,
  EMPTY,
  timer,
  defer,
  combineLatest,
  forkJoin,
  zip,
  race,
  TimeoutError
} from 'rxjs';
import {
  map,
  filter,
  switchMap,
  catchError,
  retry,
  take,
  delay,
  tap,
  mergeMap,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  share,
  shareReplay,
  finalize,
  withLatestFrom,
  throttleTime,
  bufferTime,
  bufferCount,
  scan,
  reduce,
  pairwise,
  exhaustMap,
  startWith,
  timeout
} from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

/**
 * RxJS 测试示例集
 *
 * 测试框架：Vitest
 * RxJS 版本：7.8.1
 *
 * 覆盖场景：
 * 1. 同步 Observable
 * 2. 异步 Observable
 * 3. 操作符链
 * 4. 错误处理
 * 5. Marble Testing
 * 6. 订阅管理
 * 7. 多播 Observable
 */

// ==================== 1. 测试同步 Observable ====================
describe('同步 Observable', () => {
  it('of() 同步发出多个值', () => {
    const values: number[] = [];
    const source$ = of(1, 2, 3);

    source$.subscribe(value => values.push(value));

    expect(values).toEqual([1, 2, 3]);
  });

  it('from() 从数组创建 Observable', () => {
    const values: string[] = [];
    const source$ = from(['a', 'b', 'c']);

    source$.subscribe(value => values.push(value));

    expect(values).toEqual(['a', 'b', 'c']);
  });

  it('EMPTY 不发出任何值，直接完成', () => {
    let emitted = false;
    let completed = false;

    EMPTY.subscribe({
      next: () => emitted = true,
      complete: () => completed = true
    });

    expect(emitted).toBe(false);
    expect(completed).toBe(true);
  });

  it('new Observable() 创建自定义 Observable', () => {
    const values: number[] = [];

    const custom$ = new Observable<number>(subscriber => {
      subscriber.next(10);
      subscriber.next(20);
      subscriber.next(30);
      subscriber.complete();
    });

    custom$.subscribe(value => values.push(value));

    expect(values).toEqual([10, 20, 30]);
  });
});

// ==================== 2. 测试异步 Observable ====================
describe('异步 Observable', () => {
  it('timer() 定时发出值', async () => {
    const values: number[] = [];
    const source$ = timer(10, 10).pipe(take(3));

    await new Promise<void>(resolve => {
      source$.subscribe({
        next: value => values.push(value),
        complete: () => {
          expect(values).toEqual([0, 1, 2]);
          resolve();
        }
      });
    });
  });

  it('from(Promise) 将 Promise 转为 Observable', async () => {
    const mockFetch = () => Promise.resolve({ id: 1, name: 'Test' });
    const source$ = from(mockFetch());

    const result = await new Promise(resolve => {
      source$.subscribe(resolve);
    });

    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  it('delay() 延迟发出值', async () => {
    const start = Date.now();

    await new Promise<void>(resolve => {
      of('delayed').pipe(delay(50)).subscribe({
        next: value => {
          const elapsed = Date.now() - start;
          expect(value).toBe('delayed');
          expect(elapsed).toBeGreaterThanOrEqual(50);
          resolve();
        }
      });
    });
  });

  it('defer() 延迟创建 Observable，支持异步错误', async () => {
    const source$ = defer(() => Promise.reject(new Error('异步错误')));

    await expect(async () => {
      await new Promise((resolve, reject) => {
        source$.subscribe({
          next: resolve,
          error: reject
        });
      });
    }).rejects.toThrow('异步错误');
  });
});

// ==================== 3. 测试 Observable 操作符链 ====================
describe('操作符链', () => {
  it('map() 转换每个值', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(map(x => x * 2))
      .subscribe(value => results.push(value));

    expect(results).toEqual([2, 4, 6]);
  });

  it('filter() 过滤值', () => {
    const results: number[] = [];

    of(1, 2, 3, 4, 5)
      .pipe(filter(x => x % 2 === 0))
      .subscribe(value => results.push(value));

    expect(results).toEqual([2, 4]);
  });

  it('多个操作符链式调用', () => {
    const results: number[] = [];

    of(1, 2, 3, 4, 5, 6)
      .pipe(
        filter(x => x > 2),        // [3, 4, 5, 6]
        map(x => x * 2),           // [6, 8, 10, 12]
        filter(x => x < 11)        // [6, 8, 10]
      )
      .subscribe(value => results.push(value));

    expect(results).toEqual([6, 8, 10]);
  });

  it('switchMap() 切换到新的内部 Observable，取消之前的', async () => {
    const values: string[] = [];

    await new Promise<void>(resolve => {
      of(1, 2, 3)
        .pipe(
          switchMap(id => of(`user-${id}`)),
          take(3)
        )
        .subscribe({
          next: value => values.push(value),
          complete: () => {
            expect(values).toEqual(['user-1', 'user-2', 'user-3']);
            resolve();
          }
        });
    });
  });

  it('concatMap() 按顺序处理，保证顺序', async () => {
    const values: string[] = [];

    await new Promise<void>(resolve => {
      of(1, 2, 3)
        .pipe(
          concatMap(id => of(`item-${id}`).pipe(delay(10))),
          take(3)
        )
        .subscribe({
          next: value => values.push(value),
          complete: () => {
            expect(values).toEqual(['item-1', 'item-2', 'item-3']);
            resolve();
          }
        });
    });
  });

  it('mergeMap() 并行处理，不保证顺序', async () => {
    const executionOrder: number[] = [];

    await new Promise<void>(resolve => {
      of(100, 50, 75)
        .pipe(
          mergeMap((delayMs, index) =>
            of(index).pipe(
              delay(delayMs),
              tap(i => executionOrder.push(i))
            )
          ),
          take(3)
        )
        .subscribe({
          complete: () => {
            // mergeMap 并行执行，所以顺序是 50ms, 75ms, 100ms 完成的顺序
            expect(executionOrder).toEqual([1, 2, 0]);
            resolve();
          }
        });
    });
  });

  it('distinctUntilChanged() 去除连续重复值', () => {
    const results: number[] = [];

    of(1, 1, 2, 2, 3, 3, 3, 2, 1)
      .pipe(distinctUntilChanged())
      .subscribe(value => results.push(value));

    expect(results).toEqual([1, 2, 3, 2, 1]);
  });
});

// ==================== 4. 测试错误处理 ====================
describe('错误处理', () => {
  it('catchError() 捕获错误并返回备用值', () => {
    const values: string[] = [];

    throwError(() => new Error('测试错误'))
      .pipe(
        catchError(error => of(`捕获到: ${error.message}`))
      )
      .subscribe(value => values.push(value));

    expect(values).toEqual(['捕获到: 测试错误']);
  });

  it('retry() 失败后自动重试', () => {
    let attemptCount = 0;
    const values: string[] = [];

    const source$ = defer(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return throwError(() => new Error('重试错误'));
      }
      return of('成功');
    });

    source$
      .pipe(retry(2))
      .subscribe(value => values.push(value));

    expect(attemptCount).toBe(3);
    expect(values).toEqual(['成功']);
  });

  it('操作符链中的错误处理', () => {
    const errors: Error[] = [];

    of(1, 2, 3)
      .pipe(
        map(x => {
          if (x === 2) throw new Error('值为 2');
          return x * 2;
        }),
        catchError(error => {
          errors.push(error);
          return of(-1);
        })
      )
      .subscribe();

    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe('值为 2');
  });

  it('finalize() 无论成功或失败都执行清理', () => {
    let cleanupCalled = false;

    of(1, 2, 3)
      .pipe(
        finalize(() => cleanupCalled = true)
      )
      .subscribe();

    expect(cleanupCalled).toBe(true);
  });

  it('finalize() 在错误时也会执行', () => {
    let cleanupCalled = false;

    throwError(() => new Error('测试'))
      .pipe(
        finalize(() => cleanupCalled = true)
      )
      .subscribe({
        error: () => { /* 忽略错误 */ }
      });

    expect(cleanupCalled).toBe(true);
  });
});

// ==================== 5. Marble Testing ====================
describe('Marble Testing（弹珠图测试）', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
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

// ==================== 6. 测试订阅和取消订阅 ====================
describe('订阅管理', () => {
  it('unsubscribe() 取消订阅后停止接收', async () => {
    const values: number[] = [];
    const source$ = interval(10);

    const subscription = source$.subscribe(value => {
      values.push(value);
      if (value === 2) {
        subscription.unsubscribe();
      }
    });

    await new Promise<void>(resolve => {
      setTimeout(() => {
        expect(values).toEqual([0, 1, 2]);
        resolve();
      }, 100);
    });
  });

  it('取消订阅时执行清理函数', () => {
    let cleanupCalled = false;

    const source$ = new Observable(subscriber => {
      const timer = setInterval(() => {
        subscriber.next('tick');
      }, 10);

      // 清理函数
      return () => {
        cleanupCalled = true;
        clearInterval(timer);
      };
    });

    const subscription = source$.subscribe();
    subscription.unsubscribe();

    expect(cleanupCalled).toBe(true);
  });

  it('subscription.add() 关联多个订阅，一起取消', () => {
    const cleanups: string[] = [];

    const sub1 = new Observable(() => {
      return () => cleanups.push('sub1');
    }).subscribe();

    const sub2 = new Observable(() => {
      return () => cleanups.push('sub2');
    }).subscribe();

    sub1.add(sub2);
    sub1.unsubscribe();

    expect(cleanups).toEqual(['sub1', 'sub2']);
  });

  it('subscription.closed 检查订阅状态', () => {
    const subscription = of(1, 2, 3).subscribe();

    expect(subscription.closed).toBe(true); // 同步完成后自动关闭
  });

  it('take() 操作符自动取消订阅', () => {
    const values: number[] = [];
    let subscribed = false;
    let unsubscribed = false;

    const source$ = new Observable<number>(subscriber => {
      subscribed = true;
      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);
      subscriber.next(4);

      return () => {
        unsubscribed = true;
      };
    });

    source$
      .pipe(take(2))
      .subscribe(value => values.push(value));

    expect(subscribed).toBe(true);
    expect(unsubscribed).toBe(true);
    expect(values).toEqual([1, 2]);
  });
});

// ==================== 7. 测试多播 Observable ====================
describe('多播 Observable（Subjects）', () => {
  describe('Subject - 基础多播', () => {
    it('多个订阅者同时接收值', () => {
      const subject = new Subject<number>();
      const values1: number[] = [];
      const values2: number[] = [];

      subject.subscribe(value => values1.push(value));
      subject.subscribe(value => values2.push(value));

      subject.next(1);
      subject.next(2);
      subject.complete();

      expect(values1).toEqual([1, 2]);
      expect(values2).toEqual([1, 2]);
    });

    it('订阅前发出的值不会被接收', () => {
      const subject = new Subject<number>();
      const values: number[] = [];

      subject.next(1); // 在订阅前发出

      subject.subscribe(value => values.push(value));
      subject.next(2);
      subject.next(3);

      expect(values).toEqual([2, 3]); // 不包含 1
    });

    it('错误会传递给所有订阅者', () => {
      const subject = new Subject<number>();
      const errors: Error[] = [];

      subject.subscribe({
        error: error => errors.push(error)
      });

      subject.error(new Error('测试错误'));

      expect(errors).toHaveLength(1);
      expect(errors[0]!.message).toBe('测试错误');
    });
  });

  describe('BehaviorSubject - 有初始值，保存当前值', () => {
    it('新订阅者立即收到当前值', () => {
      const subject = new BehaviorSubject<number>(0);
      const values: number[] = [];

      subject.subscribe(value => values.push(value));

      expect(values).toEqual([0]); // 立即收到初始值
    });

    it('晚订阅者收到最新值', () => {
      const subject = new BehaviorSubject<number>(0);
      const values: number[] = [];

      subject.next(1);
      subject.next(2);

      subject.subscribe(value => values.push(value));

      expect(values).toEqual([2]); // 收到最后一个值
    });

    it('getValue() 同步获取当前值', () => {
      const subject = new BehaviorSubject<number>(10);

      expect(subject.getValue()).toBe(10);

      subject.next(20);

      expect(subject.getValue()).toBe(20);
    });
  });

  describe('ReplaySubject - 重放历史值', () => {
    it('重放最后 N 个值给新订阅者', () => {
      const subject = new ReplaySubject<number>(2); // 缓存最后 2 个值
      const values: number[] = [];

      subject.next(1);
      subject.next(2);
      subject.next(3);

      subject.subscribe(value => values.push(value));

      expect(values).toEqual([2, 3]); // 收到最后 2 个值
    });

    it('不指定缓存大小时重放所有值', () => {
      const subject = new ReplaySubject<number>(); // 无限缓存
      const values: number[] = [];

      subject.next(1);
      subject.next(2);
      subject.next(3);

      subject.subscribe(value => values.push(value));

      expect(values).toEqual([1, 2, 3]); // 收到所有值
    });

    it('时间窗口内的值才会被重放', async () => {
      // 使用 vi.useFakeTimers 来精确控制时间
      vi.useFakeTimers();

      const subject = new ReplaySubject<number>(100, 100); // 100ms 时间窗口

      subject.next(1);

      // 前进 50ms，发出第二个值
      vi.advanceTimersByTime(50);
      subject.next(2);

      // 前进 80ms（总共 130ms），此时值 1 已过期（超过 100ms），值 2 还在窗口内（80ms）
      vi.advanceTimersByTime(80);

      const values: number[] = [];
      subject.subscribe(value => values.push(value));

      expect(values).toEqual([2]); // 1 已过期，只有 2 在时间窗口内

      vi.useRealTimers();
    });
  });

  describe('AsyncSubject - 只发出最后一个值（完成时）', () => {
    it('只有调用 complete() 后才发出最后一个值', () => {
      const subject = new AsyncSubject<number>();
      const values: number[] = [];

      subject.subscribe(value => values.push(value));

      subject.next(1);
      subject.next(2);
      subject.next(3);

      expect(values).toEqual([]); // 未完成，不发出

      subject.complete();

      expect(values).toEqual([3]); // 完成后只发出最后一个值
    });

    it('完成后的晚订阅者也能收到最后一个值', () => {
      const subject = new AsyncSubject<number>();

      subject.next(1);
      subject.next(2);
      subject.complete();

      const values: number[] = [];
      subject.subscribe(value => values.push(value));

      expect(values).toEqual([2]);
    });
  });

  describe('share 操作符 - 多播', () => {
    it('share() 共享同一个订阅', async () => {
      let subscriptionCount = 0;

      const source$ = new Observable<number>(subscriber => {
        subscriptionCount++;
        // 模拟异步，这样两个订阅会共享
        setTimeout(() => {
          subscriber.next(1);
          subscriber.next(2);
          subscriber.complete();
        }, 10);
      }).pipe(share());

      const values1: number[] = [];
      const values2: number[] = [];
      let completed = 0;

      // 同步订阅两次，应该共享同一个订阅
      await new Promise<void>(resolve => {
        source$.subscribe({
          next: value => values1.push(value),
          complete: () => {
            completed++;
            if (completed === 2) {
              expect(subscriptionCount).toBe(1); // 只订阅一次
              expect(values1).toEqual([1, 2]);
              expect(values2).toEqual([1, 2]);
              resolve();
            }
          }
        });

        source$.subscribe({
          next: value => values2.push(value),
          complete: () => {
            completed++;
            if (completed === 2) {
              expect(subscriptionCount).toBe(1); // 只订阅一次
              expect(values1).toEqual([1, 2]);
              expect(values2).toEqual([1, 2]);
              resolve();
            }
          }
        });
      });
    });

    it('shareReplay() 共享并重放值', () => {
      let subscriptionCount = 0;

      const source$ = new Observable<number>(subscriber => {
        subscriptionCount++;
        subscriber.next(1);
        subscriber.next(2);
        subscriber.complete();
      }).pipe(shareReplay(1));

      const values1: number[] = [];
      source$.subscribe(value => values1.push(value));

      expect(subscriptionCount).toBe(1);
      expect(values1).toEqual([1, 2]);

      // 晚订阅，但能收到最后 1 个值
      const values2: number[] = [];
      source$.subscribe(value => values2.push(value));

      expect(subscriptionCount).toBe(1); // 仍然只订阅一次
      expect(values2).toEqual([2]); // 收到重放的最后一个值
    });
  });
});

// ==================== 8. 实际应用场景测试 ====================
describe('实际应用场景', () => {
  it('搜索框防抖：debounceTime + distinctUntilChanged + switchMap', async () => {
    const searchTerms = new Subject<string>();
    const results: string[] = [];

    // 模拟搜索 API
    const mockSearch = (term: string) => of(`搜索结果: ${term}`);

    searchTerms
      .pipe(
        debounceTime(50),           // 防抖
        distinctUntilChanged(),     // 去重
        switchMap(term => mockSearch(term)) // 切换到新请求
      )
      .subscribe(result => results.push(result));

    // 模拟快速输入
    searchTerms.next('a');
    searchTerms.next('ab');
    searchTerms.next('abc');
    searchTerms.next('abc'); // 重复，会被过滤

    await new Promise<void>(resolve => {
      setTimeout(() => {
        expect(results).toEqual(['搜索结果: abc']);
        resolve();
      }, 100);
    });
  });

  it('轮询：interval + switchMap', async () => {
    let pollCount = 0;
    const results: string[] = [];

    const poll$ = interval(20).pipe(
      take(3),
      switchMap(() => of(`轮询 ${++pollCount}`))
    );

    await new Promise<void>(resolve => {
      poll$.subscribe({
        next: result => results.push(result),
        complete: () => {
          expect(results).toEqual(['轮询 1', '轮询 2', '轮询 3']);
          resolve();
        }
      });
    });
  });

  it('指数退避重试：retry + delay', async () => {
    let attemptCount = 0;
    const maxRetries = 3;

    const source$ = defer(() => {
      attemptCount++;
      if (attemptCount <= 2) {
        return throwError(() => new Error(`第 ${attemptCount} 次失败`));
      }
      return of('成功');
    });

    const retryWithBackoff$ = source$.pipe(
      retry({
        count: maxRetries,
        delay: (_error, retryCount) => timer(retryCount * 10)
      })
    );

    await new Promise<void>(resolve => {
      retryWithBackoff$.subscribe({
        next: result => {
          expect(result).toBe('成功');
          expect(attemptCount).toBe(3);
          resolve();
        }
      });
    });
  });

  it('组合多个流：mergeMap 笛卡尔积', () => {
    const values: { num: number; char: string }[] = [];
    const stream1$ = of(1, 2);
    const stream2$ = of('a', 'b');

    stream1$
      .pipe(
        mergeMap(num =>
          stream2$.pipe(
            map(char => ({ num, char }))
          )
        )
      )
      .subscribe(value => values.push(value));

    expect(values).toEqual([
      { num: 1, char: 'a' },
      { num: 1, char: 'b' },
      { num: 2, char: 'a' },
      { num: 2, char: 'b' }
    ]);
  });
});

// ==================== 9. 边界条件和错误场景 ====================
describe('边界条件测试', () => {
  it('EMPTY Observable 直接完成，不发出值', () => {
    const values: number[] = [];
    let completed = false;

    EMPTY.subscribe({
      next: value => values.push(value),
      complete: () => completed = true
    });

    expect(values).toEqual([]);
    expect(completed).toBe(true);
  });

  it('正确处理 null、undefined、0、false、空字符串', () => {
    const values: unknown[] = [];

    of(null, undefined, 0, false, '')
      .subscribe(value => values.push(value));

    expect(values).toEqual([null, undefined, 0, false, '']);
  });

  it('立即取消订阅，不会收到任何值', () => {
    let emitted = false;

    const subscription = interval(10)
      .subscribe(() => emitted = true);

    subscription.unsubscribe();

    setTimeout(() => {
      expect(emitted).toBe(false);
    }, 50);
  });

  it('同步错误立即触发 error 回调', () => {
    const errors: Error[] = [];

    throwError(() => new Error('同步错误'))
      .subscribe({
        error: error => errors.push(error)
      });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe('同步错误');
  });
});

// ==================== 10. 组合操作符 ====================
describe('组合操作符', () => {
  describe('combineLatest - 组合多个流的最新值', () => {
    it('当所有流都发出值后，组合最新值', () => {
      const values: [number, string][] = [];
      const num$ = new Subject<number>();
      const str$ = new Subject<string>();

      combineLatest([num$, str$]).subscribe(value => values.push(value));

      num$.next(1);
      expect(values).toEqual([]); // str$ 还没发出，不组合

      str$.next('a');
      expect(values).toEqual([[1, 'a']]); // 现在组合

      num$.next(2);
      expect(values).toEqual([[1, 'a'], [2, 'a']]); // 使用 str$ 的最新值

      str$.next('b');
      expect(values).toEqual([[1, 'a'], [2, 'a'], [2, 'b']]); // 使用 num$ 的最新值
    });

    it('任一流完成不影响组合，所有流完成才完成', () => {
      const values: [number, string][] = [];
      let completed = false;
      const num$ = new Subject<number>();
      const str$ = new Subject<string>();

      combineLatest([num$, str$]).subscribe({
        next: value => values.push(value),
        complete: () => completed = true
      });

      num$.next(1);
      str$.next('a');
      num$.complete(); // num$ 完成

      expect(completed).toBe(false);

      str$.next('b');
      expect(values).toEqual([[1, 'a'], [1, 'b']]); // 仍然组合

      str$.complete();
      expect(completed).toBe(true);
    });
  });

  describe('forkJoin - 等待所有流完成后发出最终值', () => {
    it('所有流完成后发出每个流的最后一个值', async () => {
      const result = await new Promise<[number, string]>(resolve => {
        forkJoin([
          of(1, 2, 3),
          of('a', 'b', 'c')
        ]).subscribe(resolve);
      });

      expect(result).toEqual([3, 'c']);
    });

    it('类似 Promise.all，常用于并行请求', async () => {
      const mockApi1 = () => of({ id: 1 }).pipe(delay(20));
      const mockApi2 = () => of({ name: 'test' }).pipe(delay(10));

      const result = await new Promise(resolve => {
        forkJoin([mockApi1(), mockApi2()]).subscribe(resolve);
      });

      expect(result).toEqual([{ id: 1 }, { name: 'test' }]);
    });

    it('任一流出错，整体出错', async () => {
      const error = await new Promise<Error>((resolve, reject) => {
        forkJoin([
          of(1),
          throwError(() => new Error('失败'))
        ]).subscribe({
          next: () => reject(new Error('不应该成功')),
          error: resolve
        });
      });

      expect(error.message).toBe('失败');
    });

    it('空流会导致 forkJoin 直接完成，不发出值', () => {
      const values: unknown[] = [];
      let completed = false;

      forkJoin([]).subscribe({
        next: value => values.push(value),
        complete: () => completed = true
      });

      expect(values).toEqual([]);
      expect(completed).toBe(true);
    });
  });

  describe('zip - 一一对应组合', () => {
    it('按索引位置配对组合', () => {
      const values: [number, string][] = [];

      zip([of(1, 2, 3), of('a', 'b', 'c')]).subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 'a'],
        [2, 'b'],
        [3, 'c']
      ]);
    });

    it('长度不同时，以短的为准', () => {
      const values: [number, string][] = [];

      zip([of(1, 2, 3, 4, 5), of('a', 'b')]).subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 'a'],
        [2, 'b']
      ]);
    });

    it('异步流也按顺序配对', async () => {
      const values: [number, string][] = [];

      await new Promise<void>(resolve => {
        zip([
          interval(20).pipe(take(3)),
          interval(30).pipe(take(3), map(i => String.fromCharCode(97 + i)))
        ]).subscribe({
          next: value => values.push(value),
          complete: resolve
        });
      });

      expect(values).toEqual([
        [0, 'a'],
        [1, 'b'],
        [2, 'c']
      ]);
    });
  });

  describe('withLatestFrom - 获取另一个流的最新值', () => {
    it('主流发出时，获取辅流的最新值', () => {
      const values: [number, string][] = [];
      const main$ = new Subject<number>();
      const aux$ = new BehaviorSubject<string>('初始');

      main$.pipe(withLatestFrom(aux$)).subscribe(value => values.push(value));

      main$.next(1);
      expect(values).toEqual([[1, '初始']]);

      aux$.next('更新');
      expect(values).toEqual([[1, '初始']]); // 辅流变化不触发

      main$.next(2);
      expect(values).toEqual([[1, '初始'], [2, '更新']]);
    });

    it('辅流未发出值时，主流发出被忽略', () => {
      const values: [number, string][] = [];
      const main$ = new Subject<number>();
      const aux$ = new Subject<string>();

      main$.pipe(withLatestFrom(aux$)).subscribe(value => values.push(value));

      main$.next(1); // 被忽略
      main$.next(2); // 被忽略
      expect(values).toEqual([]);

      aux$.next('a');
      main$.next(3);
      expect(values).toEqual([[3, 'a']]);
    });
  });

  describe('race - 取最快的流', () => {
    it('只采用最先发出值的流', async () => {
      const values: string[] = [];

      await new Promise<void>(resolve => {
        race([
          of('慢').pipe(delay(50)),
          of('快').pipe(delay(10)),
          of('中').pipe(delay(30))
        ]).subscribe({
          next: value => values.push(value),
          complete: resolve
        });
      });

      expect(values).toEqual(['快']);
    });

    it('用于请求超时备选', async () => {
      const values: string[] = [];

      await new Promise<void>(resolve => {
        race([
          of('超时').pipe(delay(100)),
          of('主请求').pipe(delay(20))
        ]).subscribe({
          next: value => values.push(value),
          complete: resolve
        });
      });

      expect(values).toEqual(['主请求']);
    });
  });
});

// ==================== 11. 节流与缓冲 ====================
describe('节流与缓冲', () => {
  describe('throttleTime - 节流', () => {
    it('节流：在时间窗口内只发出第一个值', async () => {
      vi.useFakeTimers();

      const values: number[] = [];
      const source$ = new Subject<number>();

      source$.pipe(throttleTime(100)).subscribe(value => values.push(value));

      source$.next(1); // 发出
      source$.next(2); // 被忽略（100ms 内）
      source$.next(3); // 被忽略

      expect(values).toEqual([1]);

      vi.advanceTimersByTime(100);

      source$.next(4); // 发出
      source$.next(5); // 被忽略

      expect(values).toEqual([1, 4]);

      vi.useRealTimers();
    });

    it('throttle vs debounce 对比', async () => {
      vi.useFakeTimers();

      const throttled: number[] = [];
      const debounced: number[] = [];
      const source$ = new Subject<number>();

      source$.pipe(throttleTime(50)).subscribe(value => throttled.push(value));
      source$.pipe(debounceTime(50)).subscribe(value => debounced.push(value));

      // 快速连续发出
      source$.next(1);
      source$.next(2);
      source$.next(3);

      // throttle 立即发出第一个
      expect(throttled).toEqual([1]);
      // debounce 等待静默期
      expect(debounced).toEqual([]);

      vi.advanceTimersByTime(50);

      // debounce 发出最后一个
      expect(debounced).toEqual([3]);

      vi.useRealTimers();
    });
  });

  describe('bufferTime - 按时间缓冲', () => {
    it('按时间间隔收集值', async () => {
      vi.useFakeTimers();

      const values: number[][] = [];
      const source$ = new Subject<number>();

      source$.pipe(bufferTime(100)).subscribe(value => values.push(value));

      source$.next(1);
      source$.next(2);

      vi.advanceTimersByTime(100);

      expect(values).toEqual([[1, 2]]);

      source$.next(3);

      vi.advanceTimersByTime(100);

      expect(values).toEqual([[1, 2], [3]]);

      vi.useRealTimers();
    });

    it('时间窗口内没有值时发出空数组', async () => {
      vi.useFakeTimers();

      const values: number[][] = [];
      const source$ = new Subject<number>();

      source$.pipe(bufferTime(100)).subscribe(value => values.push(value));

      vi.advanceTimersByTime(100);

      expect(values).toEqual([[]]);

      vi.useRealTimers();
    });
  });

  describe('bufferCount - 按数量缓冲', () => {
    it('收集指定数量的值后发出', () => {
      const values: number[][] = [];

      of(1, 2, 3, 4, 5, 6, 7)
        .pipe(bufferCount(3))
        .subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7] // 剩余的值
      ]);
    });

    it('带起始偏移的滑动窗口', () => {
      const values: number[][] = [];

      of(1, 2, 3, 4, 5)
        .pipe(bufferCount(3, 1)) // 每次偏移 1 个
        .subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
        [4, 5],
        [5]
      ]);
    });
  });
});

// ==================== 12. 累加与转换 ====================
describe('累加与转换', () => {
  describe('scan - 累加（保留中间值）', () => {
    it('类似 reduce，但发出每个中间值', () => {
      const values: number[] = [];

      of(1, 2, 3, 4, 5)
        .pipe(scan((acc, curr) => acc + curr, 0))
        .subscribe(value => values.push(value));

      expect(values).toEqual([1, 3, 6, 10, 15]);
    });

    it('用于状态累积', () => {
      interface State {
        count: number;
        sum: number;
      }

      const states: State[] = [];

      of(10, 20, 30)
        .pipe(
          scan(
            (state, value) => ({
              count: state.count + 1,
              sum: state.sum + value
            }),
            { count: 0, sum: 0 }
          )
        )
        .subscribe(state => states.push(state));

      expect(states).toEqual([
        { count: 1, sum: 10 },
        { count: 2, sum: 30 },
        { count: 3, sum: 60 }
      ]);
    });
  });

  describe('reduce - 累加（只发出最终值）', () => {
    it('完成后发出最终累加结果', () => {
      const values: number[] = [];

      of(1, 2, 3, 4, 5)
        .pipe(reduce((acc, curr) => acc + curr, 0))
        .subscribe(value => values.push(value));

      expect(values).toEqual([15]); // 只有最终结果
    });

    it('流不完成则不发出', () => {
      const values: number[] = [];
      const source$ = new Subject<number>();

      source$
        .pipe(reduce((acc, curr) => acc + curr, 0))
        .subscribe(value => values.push(value));

      source$.next(1);
      source$.next(2);
      source$.next(3);

      expect(values).toEqual([]); // 未完成，不发出

      source$.complete();

      expect(values).toEqual([6]);
    });
  });

  describe('pairwise - 成对发出前后值', () => {
    it('发出当前值和前一个值的数组', () => {
      const values: [number, number][] = [];

      of(1, 2, 3, 4, 5)
        .pipe(pairwise())
        .subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5]
      ]);
    });

    it('用于计算变化量', () => {
      const deltas: number[] = [];

      of(10, 15, 12, 20)
        .pipe(
          pairwise(),
          map(([prev, curr]) => curr - prev)
        )
        .subscribe(delta => deltas.push(delta));

      expect(deltas).toEqual([5, -3, 8]);
    });

    it('只有一个值时不发出', () => {
      const values: [number, number][] = [];

      of(1)
        .pipe(pairwise())
        .subscribe(value => values.push(value));

      expect(values).toEqual([]);
    });
  });
});

// ==================== 13. 流程控制 ====================
describe('流程控制', () => {
  describe('exhaustMap - 忽略新请求直到当前完成', () => {
    it('当前内部流未完成时，忽略新的外部值', async () => {
      const values: string[] = [];

      await new Promise<void>(resolve => {
        of(1, 2, 3)
          .pipe(
            exhaustMap(id => of(`请求-${id}`).pipe(delay(50)))
          )
          .subscribe({
            next: value => values.push(value),
            complete: resolve
          });
      });

      // 只有第一个请求被处理，2 和 3 在处理 1 时被忽略
      expect(values).toEqual(['请求-1']);
    });

    it('用于防止按钮重复点击', async () => {
      vi.useFakeTimers();

      const results: string[] = [];
      const clicks$ = new Subject<void>();

      clicks$
        .pipe(exhaustMap(() => of('提交成功').pipe(delay(100))))
        .subscribe(result => results.push(result));

      clicks$.next(); // 第一次点击，开始请求
      clicks$.next(); // 被忽略
      clicks$.next(); // 被忽略

      vi.advanceTimersByTime(100);

      expect(results).toEqual(['提交成功']);

      clicks$.next(); // 新的点击，可以处理了

      vi.advanceTimersByTime(100);

      expect(results).toEqual(['提交成功', '提交成功']);

      vi.useRealTimers();
    });
  });

  describe('startWith - 设置初始值', () => {
    it('在源流发出前先发出初始值', () => {
      const values: number[] = [];

      of(2, 3, 4)
        .pipe(startWith(0, 1))
        .subscribe(value => values.push(value));

      expect(values).toEqual([0, 1, 2, 3, 4]);
    });

    it('常用于 BehaviorSubject 替代', () => {
      const values: string[] = [];
      const source$ = new Subject<string>();

      source$
        .pipe(startWith('初始状态'))
        .subscribe(value => values.push(value));

      expect(values).toEqual(['初始状态']);

      source$.next('新状态');

      expect(values).toEqual(['初始状态', '新状态']);
    });
  });

  describe('timeout - 超时处理', () => {
    it('超过指定时间未发出值则抛出 TimeoutError', async () => {
      vi.useFakeTimers();

      let error: Error | null = null;

      timer(200)
        .pipe(timeout(100))
        .subscribe({
          error: e => error = e
        });

      vi.advanceTimersByTime(100);

      expect(error).toBeInstanceOf(TimeoutError);

      vi.useRealTimers();
    });

    it('在时间内发出值则正常通过', async () => {
      vi.useFakeTimers();

      const values: number[] = [];
      let error: Error | null = null;

      timer(50)
        .pipe(timeout(100))
        .subscribe({
          next: value => values.push(value),
          error: e => error = e
        });

      vi.advanceTimersByTime(100);

      expect(values).toEqual([0]);
      expect(error).toBeNull();

      vi.useRealTimers();
    });

    it('使用 with 配置提供备选值', async () => {
      vi.useFakeTimers();

      const values: string[] = [];

      timer(200)
        .pipe(
          map(() => '正常'),
          timeout({ first: 100, with: () => of('超时备选') })
        )
        .subscribe(value => values.push(value));

      vi.advanceTimersByTime(100);

      expect(values).toEqual(['超时备选']);

      vi.useRealTimers();
    });
  });
});
