import { describe, it, expect } from 'vitest';
import { throwError, of, defer } from 'rxjs';
import { catchError, retry, map, finalize } from 'rxjs/operators';

/**
 * 错误处理测试
 * 覆盖：catchError、retry、操作符链错误处理、finalize
 */

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
