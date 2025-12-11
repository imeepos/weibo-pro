import type {
  Action,
  ActionReducer,
  ActionReducerFactory,
  ActionReducerMap,
  MetaReducer,
  InitialState,
} from './models';

/**
 * 类型守卫：是否为对象（非数组）
 */
export const isObject = (target: any): target is object =>
  typeof target === 'object' && target !== null && !Array.isArray(target);

/**
 * 类型守卫：是否为纯对象（Plain Object）
 */
export const isPlainObject = (target: any): target is object => {
  if (!isObject(target)) return false;

  const targetPrototype = Object.getPrototypeOf(target);
  return targetPrototype === Object.prototype || targetPrototype === null;
};

/**
 * 合并多个 reducer 为单一 reducer
 */
export function combineReducers<T, V extends Action = Action>(
  reducers: ActionReducerMap<T, V>,
  initialState?: Partial<T>
): ActionReducer<T, V> {
  const reducerKeys = Object.keys(reducers) as (keyof T)[];
  const finalReducers: Partial<ActionReducerMap<T, V>> = {};

  for (const key of reducerKeys) {
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }

  const finalReducerKeys = Object.keys(finalReducers) as (keyof T)[];

  return function combination(state, action) {
    const workingState = state === undefined ? initialState : state;
    let hasChanged = false;
    const nextState: any = {};

    // 检查是否有 reducer 被移除（只有当 workingState 存在时才检查）
    const hasRemovedReducers = workingState
      ? (Object.keys(workingState) as (keyof T)[]).some(
          (key) => !finalReducers[key]
        )
      : false;

    for (const key of finalReducerKeys) {
      const reducer = finalReducers[key]!;
      const previousStateForKey = workingState?.[key];
      const nextStateForKey = reducer(previousStateForKey, action);

      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    // 如果有 reducer 被移除，强制返回新状态
    return hasChanged || hasRemovedReducers ? nextState : (workingState ?? nextState);
  };
}

/**
 * 移除对象中的指定键
 */
export function omit<T extends Record<string, any>>(
  object: T,
  keyToRemove: keyof T
): Partial<T> {
  return Object.keys(object)
    .filter((key) => key !== keyToRemove)
    .reduce(
      (result, key) => ({ ...result, [key]: object[key] }),
      {} as Partial<T>
    );
}

/**
 * 函数组合（从右到左）
 */
export function compose<A>(): (i: A) => A;
export function compose<A, B>(b: (i: A) => B): (i: A) => B;
export function compose<A, B, C>(c: (i: B) => C, b: (i: A) => B): (i: A) => C;
export function compose<A, B, C, D>(
  d: (i: C) => D,
  c: (i: B) => C,
  b: (i: A) => B
): (i: A) => D;
export function compose<A, B, C, D, E>(
  e: (i: D) => E,
  d: (i: C) => D,
  c: (i: B) => C,
  b: (i: A) => B
): (i: A) => E;
export function compose<A, B, C, D, E, F>(
  f: (i: E) => F,
  e: (i: D) => E,
  d: (i: C) => D,
  c: (i: B) => C,
  b: (i: A) => B
): (i: A) => F;
export function compose<A = any, F = any>(...functions: any[]): (i: A) => F;
export function compose(...functions: any[]) {
  return function (arg: any) {
    if (functions.length === 0) {
      return arg;
    }

    const last = functions[functions.length - 1];
    const rest = functions.slice(0, -1);

    return rest.reduceRight((composed, fn) => fn(composed), last(arg));
  };
}

/**
 * 创建支持 MetaReducer 的 reducer 工厂
 */
export function createReducerFactory<T, V extends Action = Action>(
  reducerFactory: ActionReducerFactory<T, V>,
  metaReducers?: MetaReducer<T, V>[]
): ActionReducerFactory<T, V> {
  if (Array.isArray(metaReducers) && metaReducers.length > 0) {
    reducerFactory = compose(...metaReducers, reducerFactory) as any;
  }

  return (reducers: ActionReducerMap<T, V>, initialState?: InitialState<T>) => {
    const reducer = reducerFactory(reducers);
    return (state: T | undefined, action: V) => {
      state = state === undefined ? (initialState as T) : state;
      return reducer(state, action);
    };
  };
}

/**
 * 创建 Feature Reducer 工厂（支持 MetaReducer）
 */
export function createFeatureReducerFactory<T, V extends Action = Action>(
  metaReducers?: MetaReducer<T, V>[]
): (reducer: ActionReducer<T, V>, initialState?: T) => ActionReducer<T, V> {
  const reducerFactory =
    Array.isArray(metaReducers) && metaReducers.length > 0
      ? compose<ActionReducer<T, V>>(...metaReducers)
      : (r: ActionReducer<T, V>) => r;

  return (reducer: ActionReducer<T, V>, initialState?: T) => {
    reducer = reducerFactory(reducer);

    return (state: T | undefined, action: V) => {
      state = state === undefined ? initialState : state;
      return reducer(state, action);
    };
  };
}
