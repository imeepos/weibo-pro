/**
 * @sker/store - Framework-agnostic state management library
 *
 * 基于 NgRx Store 核心逻辑，剥离 Angular 依赖，可运行于任何 JavaScript 环境
 */

// 核心类型
export type {
  Action,
  ActionCreator,
  ActionReducer,
  ActionReducerMap,
  ActionReducerFactory,
  ActionType,
  Creator,
  MetaReducer,
  NotAllowedCheck,
  ActionCreatorProps,
  Selector,
  SelectorWithProps,
  RuntimeChecks,
  FunctionWithParametersType,
  ValueEqualityFn,
  Prettify,
} from './models';

// Action 创建器
export { createAction, props, union, getRegisteredActionTypes } from './action-creator';

// Reducer 创建器
export { createReducer, on } from './reducer-creator';
export type { ReducerTypes, OnReducer } from './reducer-creator';

// 选择器
export {
  createSelector,
  createSelectorFactory,
  createFeatureSelector,
  defaultMemoize,
  defaultStateFn,
  resultMemoize,
  setNgrxMockEnvironment,
  isNgrxMockEnvironment,
} from './selector';

export type {
  MemoizeFn,
  MemoizedProjection,
  MemoizedSelector,
  MemoizedSelectorWithProps,
  DefaultProjectorFn,
  ComparatorFn,
} from './selector';
