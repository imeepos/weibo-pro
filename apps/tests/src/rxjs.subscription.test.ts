import { describe, it, expect } from 'vitest';
import { interval, Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';

/**
 * 订阅和取消订阅测试
 * 覆盖：unsubscribe()、清理函数、subscription.add()、closed、take()
 */

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
