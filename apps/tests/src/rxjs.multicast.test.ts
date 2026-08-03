import { describe, it, expect, vi } from 'vitest';
import { Subject, BehaviorSubject, ReplaySubject, AsyncSubject, Observable } from 'rxjs';
import { share, shareReplay } from 'rxjs/operators';

/**
 * 多播 Observable（Subjects）测试
 * 覆盖：Subject、BehaviorSubject、ReplaySubject、AsyncSubject、share、shareReplay
 */

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
