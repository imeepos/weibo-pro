import { describe, it, expect } from 'vitest';
import { of, Subject } from 'rxjs';
import { scan, reduce, pairwise, map } from 'rxjs/operators';

/**
 * 累加与转换测试
 * 覆盖：scan、reduce、pairwise
 */

// ==================== 12. 累加与转换 ====================
describe('累加与转换', () => {
  describe('scan - 累加（保留中间值）', () => {
    it('类似 reduce，但发出每个中间值', () => {
      const values: number[] = [];

      of(1, 2, 3, 4, 5)
        .pipe(scan((acc, curr) => acc + curr, 0))
        .subscribe(value => values.push(value));

      expect(values).toEqual([1, 3, 6, 10, 15]);
    });

    it('用于状态累积', () => {
      interface State {
        count: number;
        sum: number;
      }

      const states: State[] = [];

      of(10, 20, 30)
        .pipe(
          scan(
            (state, value) => ({
              count: state.count + 1,
              sum: state.sum + value
            }),
            { count: 0, sum: 0 }
          )
        )
        .subscribe(state => states.push(state));

      expect(states).toEqual([
        { count: 1, sum: 10 },
        { count: 2, sum: 30 },
        { count: 3, sum: 60 }
      ]);
    });
  });

  describe('reduce - 累加（只发出最终值）', () => {
    it('完成后发出最终累加结果', () => {
      const values: number[] = [];

      of(1, 2, 3, 4, 5)
        .pipe(reduce((acc, curr) => acc + curr, 0))
        .subscribe(value => values.push(value));

      expect(values).toEqual([15]); // 只有最终结果
    });

    it('流不完成则不发出', () => {
      const values: number[] = [];
      const source$ = new Subject<number>();

      source$
        .pipe(reduce((acc, curr) => acc + curr, 0))
        .subscribe(value => values.push(value));

      source$.next(1);
      source$.next(2);
      source$.next(3);

      expect(values).toEqual([]); // 未完成，不发出

      source$.complete();

      expect(values).toEqual([6]);
    });
  });

  describe('pairwise - 成对发出前后值', () => {
    it('发出当前值和前一个值的数组', () => {
      const values: [number, number][] = [];

      of(1, 2, 3, 4, 5)
        .pipe(pairwise())
        .subscribe(value => values.push(value));

      expect(values).toEqual([
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5]
      ]);
    });

    it('用于计算变化量', () => {
      const deltas: number[] = [];

      of(10, 15, 12, 20)
        .pipe(
          pairwise(),
          map(([prev, curr]) => curr - prev)
        )
        .subscribe(delta => deltas.push(delta));

      expect(deltas).toEqual([5, -3, 8]);
    });

    it('只有一个值时不发出', () => {
      const values: [number, number][] = [];

      of(1)
        .pipe(pairwise())
        .subscribe(value => values.push(value));

      expect(values).toEqual([]);
    });
  });
});
