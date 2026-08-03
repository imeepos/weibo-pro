import { describe, it, expect } from 'vitest';
import { Subject, BehaviorSubject, combineLatest, forkJoin, of, throwError, zip, interval, race } from 'rxjs';
import { delay, take, map, withLatestFrom } from 'rxjs/operators';

/**
 * 组合操作符测试
 * 覆盖：combineLatest、forkJoin、zip、withLatestFrom、race
 */

// ==================== 10. 组合操作符 ====================
describe('组合操作符', () => {
  describe('combineLatest - 组合多个流的最新值', () => {
    it('当所有流都发出值后，组合最新值', () => {
      const values: [number, string][] = [];
      const num$ = new Subject<number>();
      const str$ = new Subject<string>();

      combineLatest([num$, str$]).subscribe(value => values.push(value));

      num$.next(1);
      expect(values).toEqual([]); // str$ 还没发出，不组合

      str$.next('a');
      expect(values).toEqual([[1, 'a']]); // 现在组合

      num$.next(2);
      expect(values).toEqual([[1, 'a'], [2, 'a']]); // 使用 str$ 的最新值

      str$.next('b');
      expect(values).toEqual([[1, 'a'], [2, 'a'], [2, 'b']]); // 使用 num$ 的最新值
    });

    it('任一流完成不影响组合，所有流完成才完成', () => {
      const values: [number, string][] = [];
      let completed = false;
      const num$ = new Subject<number>();
      const str$ = new Subject<string>();

      combineLatest([num$, str$]).subscribe({
        next: value => values.push(value),
        complete: () => completed = true
      });

      num$.next(1);
      str$.next('a');
      num$.complete(); // num$ 完成

      expect(completed).toBe(false);

      str$.next('b');
      expect(values).toEqual([[1, 'a'], [1, 'b']]); // 仍然组合

      str$.complete();
      expect(completed).toBe(true);
    });
  });

  describe('forkJoin - 等待所有流完成后发出最终值', () => {
    it('所有流完成后发出每个流的最后一个值', async () => {
      const result = await new Promise<[number, string]>(resolve => {
        forkJoin([
          of(1, 2, 3),
          of('a', 'b', 'c')
        ]).subscribe(resolve);
      });

      expect(result).toEqual([3, 'c']);
    });

    it('类似 Promise.all，常用于并行请求', async () => {
      const mockApi1 = () => of({ id: 1 }).pipe(delay(20));
      const mockApi2 = () => of({ name: 'test' }).pipe(delay(10));

      const result = await new Promise(resolve => {
        forkJoin([mockApi1(), mockApi2()]).subscribe(resolve);
      });

      expect(result).toEqual([{ id: 1 }, { name: 'test' }]);
    });

    it('任一流出错，整体出错', async () => {
      const error = await new Promise<Error>((resolve, reject) => {
        forkJoin([
          of(1),
          throwError(() => new Error('失败'))
        ]).subscribe({
          next: () => reject(new Error('不应该成功')),
          error: resolve
        });
      });

      expect(error.message).toBe('失败');
    });

    it('空流会导致 forkJoin 直接完成，不发出值', () => {
      const values: unknown[] = [];
      let completed = false;

      forkJoin([]).subscribe({
        next: value => values.push(value),
        complete: () => completed = true
      });

      expect(values).toEqual([]);
      expect(completed).toBe(true);
    });
  });

  describe('zip - 一一对应组合', () => {
    it('按索引位置配对组合', () => {
      const values: [number, string][] = [];

      zip([of(1, 2, 3), of('a', 'b', 'c')]).subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 'a'],
        [2, 'b'],
        [3, 'c']
      ]);
    });

    it('长度不同时，以短的为准', () => {
      const values: [number, string][] = [];

      zip([of(1, 2, 3, 4, 5), of('a', 'b')]).subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 'a'],
        [2, 'b']
      ]);
    });

    it('异步流也按顺序配对', async () => {
      const values: [number, string][] = [];

      await new Promise<void>(resolve => {
        zip([
          interval(20).pipe(take(3)),
          interval(30).pipe(take(3), map(i => String.fromCharCode(97 + i)))
        ]).subscribe({
          next: value => values.push(value),
          complete: resolve
        });
      });

      expect(values).toEqual([
        [0, 'a'],
        [1, 'b'],
        [2, 'c']
      ]);
    });
  });

  describe('withLatestFrom - 获取另一个流的最新值', () => {
    it('主流发出时，获取辅流的最新值', () => {
      const values: [number, string][] = [];
      const main$ = new Subject<number>();
      const aux$ = new BehaviorSubject<string>('初始');

      main$.pipe(withLatestFrom(aux$)).subscribe(value => values.push(value));

      main$.next(1);
      expect(values).toEqual([[1, '初始']]);

      aux$.next('更新');
      expect(values).toEqual([[1, '初始']]); // 辅流变化不触发

      main$.next(2);
      expect(values).toEqual([[1, '初始'], [2, '更新']]);
    });

    it('辅流未发出值时，主流发出被忽略', () => {
      const values: [number, string][] = [];
      const main$ = new Subject<number>();
      const aux$ = new Subject<string>();

      main$.pipe(withLatestFrom(aux$)).subscribe(value => values.push(value));

      main$.next(1); // 被忽略
      main$.next(2); // 被忽略
      expect(values).toEqual([]);

      aux$.next('a');
      main$.next(3);
      expect(values).toEqual([[3, 'a']]);
    });
  });

  describe('race - 取最快的流', () => {
    it('只采用最先发出值的流', async () => {
      const values: string[] = [];

      await new Promise<void>(resolve => {
        race([
          of('慢').pipe(delay(50)),
          of('快').pipe(delay(10)),
          of('中').pipe(delay(30))
        ]).subscribe({
          next: value => values.push(value),
          complete: resolve
        });
      });

      expect(values).toEqual(['快']);
    });

    it('用于请求超时备选', async () => {
      const values: string[] = [];

      await new Promise<void>(resolve => {
        race([
          of('超时').pipe(delay(100)),
          of('主请求').pipe(delay(20))
        ]).subscribe({
          next: value => values.push(value),
          complete: resolve
        });
      });

      expect(values).toEqual(['主请求']);
    });
  });
});
