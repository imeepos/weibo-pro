import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import {
  map,
  filter,
  switchMap,
  take,
  concatMap,
  delay,
  mergeMap,
  tap,
  distinctUntilChanged
} from 'rxjs/operators';

/**
 * Observable 操作符链测试
 * 覆盖：map、filter、switchMap、concatMap、mergeMap、distinctUntilChanged
 */

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
