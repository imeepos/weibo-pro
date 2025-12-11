import { Selector, SelectorWithProps } from './models';

export type AnyFn = (...args: any[]) => any;

export type MemoizedProjection = {
  memoized: AnyFn;
  reset: () => void;
  setResult: (result?: any) => void;
  clearResult: () => void;
};

export type MemoizeFn = (t: AnyFn) => MemoizedProjection;
export type ComparatorFn = (a: any, b: any) => boolean;
export type DefaultProjectorFn<T> = (...args: any[]) => T;

export interface MemoizedSelector<
  State,
  Result,
  ProjectorFn = DefaultProjectorFn<Result>,
> extends Selector<State, Result> {
  release(): void;
  projector: ProjectorFn;
  setResult: (result?: Result) => void;
  clearResult: () => void;
}

/**
 * @deprecated Selectors with props are deprecated
 */
export interface MemoizedSelectorWithProps<
  State,
  Props,
  Result,
  ProjectorFn = DefaultProjectorFn<Result>,
> extends SelectorWithProps<State, Props, Result> {
  release(): void;
  projector: ProjectorFn;
  setResult: (result?: Result) => void;
  clearResult: () => void;
}

/**
 * 开发模式判断（替代 Angular 的 isDevMode）
 */
const isDevMode = (): boolean => {
  return process.env.NODE_ENV !== 'production';
};

/**
 * Mock 环境标志
 */
let ngrxMockEnvironment = false;
export function setNgrxMockEnvironment(value: boolean): void {
  ngrxMockEnvironment = value;
}
export function isNgrxMockEnvironment(): boolean {
  return ngrxMockEnvironment;
}

export function isEqualCheck(a: any, b: any): boolean {
  return a === b;
}

function isArgumentsChanged(
  args: IArguments,
  lastArguments: IArguments,
  comparator: ComparatorFn
) {
  for (let i = 0; i < args.length; i++) {
    if (!comparator(args[i], lastArguments[i])) {
      return true;
    }
  }
  return false;
}

/**
 * 结果记忆化
 */
export function resultMemoize(
  projectionFn: AnyFn,
  isResultEqual: ComparatorFn
) {
  return defaultMemoize(projectionFn, isEqualCheck, isResultEqual);
}

/**
 * 默认记忆化策略
 */
export function defaultMemoize(
  projectionFn: AnyFn,
  isArgumentsEqual = isEqualCheck,
  isResultEqual = isEqualCheck
): MemoizedProjection {
  let lastArguments: null | IArguments = null;
  let lastResult: any = null;
  let overrideResult: any;

  function reset() {
    lastArguments = null;
    lastResult = null;
  }

  function setResult(result: any = undefined) {
    overrideResult = { result };
  }

  function clearResult() {
    overrideResult = undefined;
  }

  function memoized(): any {
    if (overrideResult !== undefined) {
      return overrideResult.result;
    }

    if (!lastArguments) {
      lastResult = projectionFn.apply(null, arguments as any);
      lastArguments = arguments;
      return lastResult;
    }

    if (!isArgumentsChanged(arguments, lastArguments, isArgumentsEqual)) {
      return lastResult;
    }

    const newResult = projectionFn.apply(null, arguments as any);
    lastArguments = arguments;

    if (isResultEqual(lastResult, newResult)) {
      return lastResult;
    }

    lastResult = newResult;
    return newResult;
  }

  return { memoized, reset, setResult, clearResult };
}

// 以下是 createSelector 的重载签名（保持与 NgRx 兼容）
export function createSelector<State, S1, Result>(
  s1: Selector<State, S1>,
  projector: (s1: S1) => Result
): MemoizedSelector<State, Result, typeof projector>;

export function createSelector<State, S1, S2, Result>(
  s1: Selector<State, S1>,
  s2: Selector<State, S2>,
  projector: (s1: S1, s2: S2) => Result
): MemoizedSelector<State, Result, typeof projector>;

export function createSelector<State, S1, S2, S3, Result>(
  s1: Selector<State, S1>,
  s2: Selector<State, S2>,
  s3: Selector<State, S3>,
  projector: (s1: S1, s2: S2, s3: S3) => Result
): MemoizedSelector<State, Result, typeof projector>;

export function createSelector<State, S1, S2, S3, S4, Result>(
  s1: Selector<State, S1>,
  s2: Selector<State, S2>,
  s3: Selector<State, S3>,
  s4: Selector<State, S4>,
  projector: (s1: S1, s2: S2, s3: S3, s4: S4) => Result
): MemoizedSelector<State, Result, typeof projector>;

export function createSelector<State, Slices extends unknown[], Result>(
  ...args: [...slices: Selector<State, unknown>[], projector: unknown] &
    [
      ...slices: { [i in keyof Slices]: Selector<State, Slices[i]> },
      projector: (...s: Slices) => Result,
    ]
): MemoizedSelector<State, Result, (...s: Slices) => Result>;

/**
 * 创建记忆化选择器
 *
 * @example
 * ```ts
 * const selectCount = (state: State) => state.count;
 * const selectDouble = createSelector(
 *   selectCount,
 *   (count) => count * 2
 * );
 * ```
 */
export function createSelector(
  ...input: any[]
): MemoizedSelector<any, any> | MemoizedSelectorWithProps<any, any, any> {
  return createSelectorFactory(defaultMemoize)(...input);
}

export function defaultStateFn(
  state: any,
  selectors: Selector<any, any>[] | SelectorWithProps<any, any, any>[],
  props: any,
  memoizedProjector: MemoizedProjection
): any {
  if (props === undefined) {
    const args = (<Selector<any, any>[]>selectors).map((fn) => fn(state));
    return memoizedProjector.memoized.apply(null, args);
  }

  const args = (<SelectorWithProps<any, any, any>[]>selectors).map((fn) =>
    fn(state, props)
  );
  return memoizedProjector.memoized.apply(null, [...args, props]);
}

export type SelectorFactoryConfig<T = any, V = any> = {
  stateFn: (
    state: T,
    selectors: Selector<any, any>[],
    props: any,
    memoizedProjector: MemoizedProjection
  ) => V;
};

/**
 * 创建选择器工厂
 */
export function createSelectorFactory<T = any, V = any>(
  memoize: MemoizeFn,
  options: SelectorFactoryConfig<T, V> = {
    stateFn: defaultStateFn,
  }
) {
  return function (
    ...input: any[]
  ): MemoizedSelector<any, any> | MemoizedSelectorWithProps<any, any, any> {
    let args = input;
    if (Array.isArray(args[0])) {
      const [head, ...tail] = args;
      args = [...head, ...tail];
    } else if (args.length === 1 && isSelectorsDictionary(args[0])) {
      args = extractArgsFromSelectorsDictionary(args[0]);
    }

    const selectors = args.slice(0, args.length - 1);
    const projector = args[args.length - 1];
    const memoizedSelectors = selectors.filter(
      (selector: any) =>
        selector.release && typeof selector.release === 'function'
    );

    const memoizedProjector = memoize(function (...selectors: any[]) {
      return projector.apply(null, selectors);
    });

    const memoizedState = defaultMemoize(function (state: any, props: any) {
      return options.stateFn.apply(null, [
        state,
        selectors,
        props,
        memoizedProjector,
      ]);
    });

    function release() {
      memoizedState.reset();
      memoizedProjector.reset();
      memoizedSelectors.forEach((selector) => selector.release());
    }

    return Object.assign(memoizedState.memoized, {
      release,
      projector: memoizedProjector.memoized,
      setResult: memoizedState.setResult,
      clearResult: memoizedState.clearResult,
    });
  };
}

/**
 * 创建 Feature 选择器
 */
export function createFeatureSelector<T>(
  featureName: string
): MemoizedSelector<object, T> {
  return createSelector(
    (state: any) => {
      const featureState = state[featureName];
      if (!isNgrxMockEnvironment() && isDevMode() && !(featureName in state)) {
        console.warn(
          `@sker/store: Feature "${featureName}" 不存在于 state 中`
        );
      }
      return featureState;
    },
    (featureState: any) => featureState
  );
}

function isSelectorsDictionary(
  selectors: unknown
): selectors is Record<string, Selector<unknown, unknown>> {
  return (
    !!selectors &&
    typeof selectors === 'object' &&
    Object.values(selectors).every((selector) => typeof selector === 'function')
  );
}

function extractArgsFromSelectorsDictionary(
  selectorsDictionary: Record<string, Selector<unknown, unknown>>
): [
  ...selectors: Selector<unknown, unknown>[],
  projector: (...selectorResults: unknown[]) => unknown,
] {
  const selectors = Object.values(selectorsDictionary);
  const resultKeys = Object.keys(selectorsDictionary);
  const projector = (...selectorResults: unknown[]) =>
    resultKeys.reduce(
      (result, key, index) => ({
        ...result,
        [key]: selectorResults[index],
      }),
      {}
    );

  return [...selectors, projector];
}
