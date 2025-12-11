/**
 * 值相等比较函数
 */
export type ValueEqualityFn<T> = (a: T, b: T) => boolean;

export interface Action<Type extends string = string> {
  type: Type;
}

export type ActionType<A> =
  A extends ActionCreator<infer T, infer C>
    ? ReturnType<C> & { type: T }
    : never;

export type TypeId<T> = () => T;

export type InitialState<T> = Partial<T> | TypeId<Partial<T>> | void;

/**
 * Reducer 函数：接收 State 和 Action，返回新的 State
 */
export interface ActionReducer<T, V extends Action = Action> {
  (state: T | undefined, action: V): T;
}

export type ActionReducerMap<T, V extends Action = Action> = {
  [p in keyof T]: ActionReducer<T[p], V>;
};

export interface ActionReducerFactory<T, V extends Action = Action> {
  (
    reducerMap: ActionReducerMap<T, V>,
    initialState?: InitialState<T>
  ): ActionReducer<T, V>;
}

export type MetaReducer<T = any, V extends Action = Action> = (
  reducer: ActionReducer<T, V>
) => ActionReducer<T, V>;

export interface StoreFeature<T, V extends Action = Action> {
  key: string;
  reducers: ActionReducerMap<T, V> | ActionReducer<T, V>;
  reducerFactory: ActionReducerFactory<T, V>;
  initialState?: InitialState<T>;
  metaReducers?: MetaReducer<T, V>[];
}

export type Selector<T, V> = (state: T) => V;

/**
 * @deprecated Selectors with props are deprecated
 */
export type SelectorWithProps<State, Props, Result> = (
  state: State,
  props: Props
) => Result;

// Action Creator 类型检查错误消息
export const arraysAreNotAllowedMsg = 'action creator cannot return an array';
type ArraysAreNotAllowed = typeof arraysAreNotAllowedMsg;

export const typePropertyIsNotAllowedMsg =
  'action creator cannot return an object with a property named `type`';
type TypePropertyIsNotAllowed = typeof typePropertyIsNotAllowedMsg;

export const emptyObjectsAreNotAllowedMsg =
  'action creator cannot return an empty object';
type EmptyObjectsAreNotAllowed = typeof emptyObjectsAreNotAllowedMsg;

export const arraysAreNotAllowedInProps =
  'action creator props cannot be an array';
type ArraysAreNotAllowedInProps = typeof arraysAreNotAllowedInProps;

export const typePropertyIsNotAllowedInProps =
  'action creator props cannot have a property named `type`';
type TypePropertyIsNotAllowedInProps = typeof typePropertyIsNotAllowedInProps;

export const emptyObjectsAreNotAllowedInProps =
  'action creator props cannot be an empty object';
type EmptyObjectsAreNotAllowedInProps = typeof emptyObjectsAreNotAllowedInProps;

export const primitivesAreNotAllowedInProps =
  'action creator props cannot be a primitive value';
type PrimitivesAreNotAllowedInProps = typeof primitivesAreNotAllowedInProps;

export type CreatorsNotAllowedCheck<T> = T extends ActionCreator
  ? 'Action creator is not allowed to be dispatched. Did you forget to call it?'
  : unknown;

/**
 * Action Creator 函数类型
 */
export type Creator<
  P extends any[] = any[],
  R extends object = object,
> = FunctionWithParametersType<P, R>;

export type Primitive =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | null
  | undefined;

export type NotAllowedCheck<T extends object> = T extends any[]
  ? ArraysAreNotAllowed
  : T extends { type: any }
    ? TypePropertyIsNotAllowed
    : keyof T extends never
      ? EmptyObjectsAreNotAllowed
      : unknown;

export type NotAllowedInPropsCheck<T> = T extends object
  ? T extends any[]
    ? ArraysAreNotAllowedInProps
    : T extends { type: any }
      ? TypePropertyIsNotAllowedInProps
      : keyof T extends never
        ? EmptyObjectsAreNotAllowedInProps
        : unknown
  : T extends Primitive
    ? PrimitivesAreNotAllowedInProps
    : never;

export type ActionCreator<
  T extends string = string,
  C extends Creator = Creator,
> = C & Action<T>;

export interface ActionCreatorProps<T> {
  _as: 'props';
  _p: T;
}

export type FunctionWithParametersType<P extends unknown[], R = void> = (
  ...args: P
) => R;

export interface RuntimeChecks {
  strictStateSerializability: boolean;
  strictActionSerializability: boolean;
  strictStateImmutability: boolean;
  strictActionImmutability: boolean;
  strictActionTypeUniqueness?: boolean;
}

export interface SelectSignalOptions<T> {
  equal?: ValueEqualityFn<T>;
}

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
