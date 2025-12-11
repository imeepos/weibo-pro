import { Observable, Observer, Operator } from 'rxjs';
import { distinctUntilChanged, map, pluck } from 'rxjs/operators';
import { ActionsSubject } from './actions-subject';
import type { Action, ActionReducer } from './models';
import { ReducerManager } from './reducer-manager';
import { StateObservable } from './state';

/**
 * Store - 响应式状态容器
 *
 * 核心功能：
 * 1. dispatch(action) - 派发 Action
 * 2. select(selector) - 选择状态切片
 * 3. subscribe(observer) - 订阅状态变更
 * 4. addReducer/removeReducer - 动态管理 Reducer
 */
export class Store<T = any> extends Observable<T> implements Observer<Action> {
  constructor(
    state$: StateObservable,
    private actionsObserver: ActionsSubject,
    private reducerManager: ReducerManager
  ) {
    super();
    this.source = state$;
  }

  /**
   * 选择状态切片（函数选择器）
   */
  select<K>(mapFn: (state: T) => K): Observable<K>;

  /**
   * 选择状态切片（键路径）
   */
  select<a extends keyof T>(key: a): Observable<T[a]>;
  select<a extends keyof T, b extends keyof T[a]>(
    key1: a,
    key2: b
  ): Observable<T[a][b]>;
  select<a extends keyof T, b extends keyof T[a], c extends keyof T[a][b]>(
    key1: a,
    key2: b,
    key3: c
  ): Observable<T[a][b][c]>;
  select<
    a extends keyof T,
    b extends keyof T[a],
    c extends keyof T[a][b],
    d extends keyof T[a][b][c]
  >(key1: a, key2: b, key3: c, key4: d): Observable<T[a][b][c][d]>;
  select<
    a extends keyof T,
    b extends keyof T[a],
    c extends keyof T[a][b],
    d extends keyof T[a][b][c],
    e extends keyof T[a][b][c][d]
  >(
    key1: a,
    key2: b,
    key3: c,
    key4: d,
    key5: e
  ): Observable<T[a][b][c][d][e]>;
  select<
    a extends keyof T,
    b extends keyof T[a],
    c extends keyof T[a][b],
    d extends keyof T[a][b][c],
    e extends keyof T[a][b][c][d],
    f extends keyof T[a][b][c][d][e]
  >(
    key1: a,
    key2: b,
    key3: c,
    key4: d,
    key5: e,
    key6: f
  ): Observable<T[a][b][c][d][e][f]>;
  select<K = any>(
    pathOrMapFn: ((state: T) => K) | string,
    ...paths: string[]
  ): Observable<any> {
    return (select as any)(pathOrMapFn, ...paths)(this);
  }

  /**
   * 使用 RxJS operator 转换 Store
   */
  override lift<R>(operator: Operator<T, R>): Store<R> {
    const store = new Store<R>(this, this.actionsObserver, this.reducerManager);
    store.operator = operator;
    return store;
  }

  /**
   * 派发 Action
   */
  dispatch(action: Action): void {
    this.actionsObserver.next(action);
  }

  /**
   * 实现 Observer 接口：next
   */
  next(action: Action): void {
    this.actionsObserver.next(action);
  }

  /**
   * 实现 Observer 接口：error
   */
  error(err: any): void {
    this.actionsObserver.error(err);
  }

  /**
   * 实现 Observer 接口：complete
   */
  complete(): void {
    this.actionsObserver.complete();
  }

  /**
   * 动态添加 Reducer
   */
  addReducer<State, Actions extends Action = Action>(
    key: string,
    reducer: ActionReducer<State, Actions>
  ): void {
    this.reducerManager.addReducer(key, reducer);
  }

  /**
   * 动态移除 Reducer
   */
  removeReducer<Key extends Extract<keyof T, string>>(key: Key): void {
    this.reducerManager.removeReducer(key);
  }
}

/**
 * select - RxJS operator 工厂
 *
 * 用于从状态流中选择切片，自动去重
 */
export function select<T, K>(
  mapFn: (state: T) => K
): (source$: Observable<T>) => Observable<K>;
export function select<T, a extends keyof T>(
  key: a
): (source$: Observable<T>) => Observable<T[a]>;
export function select<T, a extends keyof T, b extends keyof T[a]>(
  key1: a,
  key2: b
): (source$: Observable<T>) => Observable<T[a][b]>;
export function select<
  T,
  a extends keyof T,
  b extends keyof T[a],
  c extends keyof T[a][b]
>(
  key1: a,
  key2: b,
  key3: c
): (source$: Observable<T>) => Observable<T[a][b][c]>;
export function select<
  T,
  a extends keyof T,
  b extends keyof T[a],
  c extends keyof T[a][b],
  d extends keyof T[a][b][c]
>(
  key1: a,
  key2: b,
  key3: c,
  key4: d
): (source$: Observable<T>) => Observable<T[a][b][c][d]>;
export function select<
  T,
  a extends keyof T,
  b extends keyof T[a],
  c extends keyof T[a][b],
  d extends keyof T[a][b][c],
  e extends keyof T[a][b][c][d]
>(
  key1: a,
  key2: b,
  key3: c,
  key4: d,
  key5: e
): (source$: Observable<T>) => Observable<T[a][b][c][d][e]>;
export function select<
  T,
  a extends keyof T,
  b extends keyof T[a],
  c extends keyof T[a][b],
  d extends keyof T[a][b][c],
  e extends keyof T[a][b][c][d],
  f extends keyof T[a][b][c][d][e]
>(
  key1: a,
  key2: b,
  key3: c,
  key4: d,
  key5: e,
  key6: f
): (source$: Observable<T>) => Observable<T[a][b][c][d][e][f]>;
export function select<T, K = any>(
  pathOrMapFn: ((state: T) => K) | string,
  ...paths: string[]
): (source$: Observable<T>) => Observable<K> {
  return function selectOperator(source$: Observable<T>): Observable<K> {
    let mapped$: Observable<any>;

    if (typeof pathOrMapFn === 'string') {
      const pathSlices = paths.filter(Boolean);
      mapped$ = source$.pipe(pluck(pathOrMapFn, ...pathSlices));
    } else if (typeof pathOrMapFn === 'function') {
      mapped$ = source$.pipe(map((source) => pathOrMapFn(source)));
    } else {
      throw new TypeError(
        `Unexpected type '${typeof pathOrMapFn}' in select operator, ` +
        `expected 'string' or 'function'`
      );
    }

    return mapped$.pipe(distinctUntilChanged());
  };
}
