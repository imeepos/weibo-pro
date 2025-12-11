import {
  Creator,
  ActionCreator,
  Action,
  FunctionWithParametersType,
  NotAllowedCheck,
  ActionCreatorProps,
  NotAllowedInPropsCheck,
} from './models';

/**
 * 全局 Action 类型注册表（用于运行时检查重复）
 */
const REGISTERED_ACTION_TYPES: Record<string, number> = {};

/**
 * 创建 Action Creator
 *
 * @example
 * ```ts
 * const increment = createAction('[Counter] Increment');
 * store.dispatch(increment());
 * ```
 */
export function createAction<T extends string>(
  type: T
): ActionCreator<T, () => Action<T>>;

export function createAction<T extends string, P extends object>(
  type: T,
  config: ActionCreatorProps<P> & NotAllowedCheck<P>
): ActionCreator<T, (props: P & NotAllowedCheck<P>) => P & Action<T>>;

export function createAction<
  T extends string,
  P extends any[],
  R extends object,
>(
  type: T,
  creator: Creator<P, R & NotAllowedCheck<R>>
): FunctionWithParametersType<P, R & Action<T>> & Action<T>;

export function createAction<T extends string, C extends Creator>(
  type: T,
  config?: { _as: 'props' } | C
): ActionCreator<T> {
  REGISTERED_ACTION_TYPES[type] = (REGISTERED_ACTION_TYPES[type] || 0) + 1;

  if (typeof config === 'function') {
    return defineType(type, (...args: any[]) => ({
      ...config(...args),
      type,
    }));
  }
  const as = config ? config._as : 'empty';
  switch (as) {
    case 'empty':
      return defineType(type, () => ({ type }));
    case 'props':
      return defineType(type, (props: object) => ({
        ...props,
        type,
      }));
    default:
      throw new Error('Unexpected config.');
  }
}

/**
 * 定义 Action 的 props
 */
export function props<
  P extends SafeProps,
  SafeProps = NotAllowedInPropsCheck<P>,
>(): ActionCreatorProps<P> {
  return { _as: 'props', _p: undefined! };
}

/**
 * 用于类型推导的 union 辅助函数
 */
export function union<
  C extends { [key: string]: ActionCreator<string, Creator> },
>(creators: C): ReturnType<C[keyof C]> {
  return undefined!;
}

function defineType<T extends string>(
  type: T,
  creator: Creator
): ActionCreator<T> {
  return Object.defineProperty(creator, 'type', {
    value: type,
    writable: false,
  }) as ActionCreator<T>;
}

/**
 * 获取已注册的 Action 类型（用于调试）
 */
export function getRegisteredActionTypes(): Record<string, number> {
  return { ...REGISTERED_ACTION_TYPES };
}
