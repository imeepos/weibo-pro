import { describe, it, expect, vi } from 'vitest';
import { Subject, of } from 'rxjs';
import { throttleTime, debounceTime, bufferTime, bufferCount } from 'rxjs/operators';

/**
 * 节流与缓冲测试
 * 覆盖：throttleTime、bufferTime、bufferCount
 */

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
