import { describe, it, expect } from 'vitest';
import { of, from, EMPTY, Observable } from 'rxjs';

/**
 * 同步 Observable 测试
 * 覆盖：of()、from()、EMPTY、new Observable()
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
