import { describe, it, expect } from 'vitest';
import { Subject, of, interval, take, defer, throwError, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, retry, mergeMap, map } from 'rxjs/operators';

/**
 * 实际应用场景测试
 * 覆盖：搜索框防抖、轮询、指数退避重试、多流组合
 */

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
