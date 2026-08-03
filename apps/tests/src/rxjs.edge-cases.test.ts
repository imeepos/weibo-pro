import { describe, it, expect } from 'vitest';
import { EMPTY, of, interval, throwError } from 'rxjs';

/**
 * 边界条件和错误场景测试
 * 覆盖：EMPTY、特殊值（null/undefined/0/false/''）、立即取消订阅、同步错误
 */

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
