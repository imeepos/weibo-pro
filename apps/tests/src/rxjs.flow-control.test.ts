import { describe, it, expect, vi } from 'vitest';
import { of, Subject, timer, TimeoutError } from 'rxjs';
import { delay, exhaustMap, startWith, timeout, map } from 'rxjs/operators';

/**
 * 流程控制测试
 * 覆盖：exhaustMap、startWith、timeout
 */

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
