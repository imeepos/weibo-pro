import { describe, it, expect } from 'vitest';
import { timer, from, of, defer } from 'rxjs';
import { take, delay } from 'rxjs/operators';

/**
 * 异步 Observable 测试
 * 覆盖：timer()、from(Promise)、delay()、defer()
 */

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
