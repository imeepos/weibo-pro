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
  RuntimeChecks,
  FunctionWithParametersType,
  ValueEqualityFn,
  Prettify,
} from './models';

// Action 创建器
export { createAction, props, union, getRegisteredActionTypes } from './action-creator';

// Action Group 创建器
export { createActionGroup, emptyProps } from './action-group-creator';

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
  DefaultProjectorFn,
  ComparatorFn,
} from './selector';

// Feature 创建器
export { createFeature } from './feature-creator';
export type { FeatureConfig } from './feature-creator';

// 辅助函数
export { capitalize, uncapitalize, assertDefined } from './helpers';

// 工具函数
export {
  isObject,
  isPlainObject,
  combineReducers,
  omit,
  compose,
  createReducerFactory,
  createFeatureReducerFactory,
} from './utils';

// ========== 运行时（Runtime）API ==========

// Store 核心
export { Store, select } from './store';

// Store 创建器
export { createStore } from './create-store';
export type { StoreConfig } from './create-store';

// ActionsSubject
export { ActionsSubject, INIT } from './actions-subject';

// State 管理
export { State, StateObservable, ScannedActionsSubject } from './state';
export type { StateActionPair } from './state';

// Reducer 管理
export { ReducerManager, ReducerObservable, UPDATE } from './reducer-manager';
export type { StoreFeature } from './reducer-manager';

