import { BehaviorSubject, Observable } from 'rxjs';
import type { ActionsSubject } from './actions-subject';
import type {
  Action,
  ActionReducer,
  ActionReducerFactory,
  ActionReducerMap,
  MetaReducer,
} from './models';
import {
  combineReducers,
  omit,
  createReducerFactory,
  createFeatureReducerFactory,
} from './utils';

export const UPDATE = '@sker/store/update-reducers' as const;

/**
 * StoreFeature - Feature 模块定义
 */
export interface StoreFeature<T, V extends Action = Action> {
  key: string;
  reducers: ActionReducerMap<T, V> | ActionReducer<T, V>;
  reducerFactory: ActionReducerFactory<T, V>;
  initialState?: T;
  metaReducers?: MetaReducer<T, V>[];
}

/**
 * ReducerManager - Reducer 管理器
 *
 * 基于 BehaviorSubject，负责 Reducer 的动态注册、移除和合并。
 * 每次 reducer 变更时，发布新的根 reducer 到流中。
 */
export class ReducerManager extends BehaviorSubject<ActionReducer<any, any>> {
  private reducers: ActionReducerMap<any, any>;

  get currentReducers(): ActionReducerMap<any, any> {
    return this.reducers;
  }

  constructor(
    private dispatcher: ActionsSubject,
    private initialState: any,
    initialReducers: ActionReducerMap<any, any>,
    private reducerFactory: ActionReducerFactory<any, any>
  ) {
    super(reducerFactory(initialReducers, initialState));
    this.reducers = initialReducers;
  }

  /**
   * 添加单个 Feature
   */
  addFeature(feature: StoreFeature<any, any>): void {
    this.addFeatures([feature]);
  }

  /**
   * 批量添加 Features
   */
  addFeatures(features: StoreFeature<any, any>[]): void {
    const reducers = features.reduce((reducerDict, feature) => {
      const { reducers, reducerFactory, metaReducers, initialState, key } = feature;

      const reducer =
        typeof reducers === 'function'
          ? createFeatureReducerFactory(metaReducers)(reducers, initialState)
          : createReducerFactory(reducerFactory, metaReducers)(
              reducers,
              initialState
            );

      reducerDict[key] = reducer;
      return reducerDict;
    }, {} as Record<string, ActionReducer<any, any>>);

    this.addReducers(reducers);
  }

  /**
   * 移除单个 Feature
   */
  removeFeature(feature: StoreFeature<any, any>): void {
    this.removeFeatures([feature]);
  }

  /**
   * 批量移除 Features
   */
  removeFeatures(features: StoreFeature<any, any>[]): void {
    this.removeReducers(features.map((f) => f.key));
  }

  /**
   * 添加单个 Reducer
   */
  addReducer(key: string, reducer: ActionReducer<any, any>): void {
    this.addReducers({ [key]: reducer });
  }

  /**
   * 批量添加 Reducers
   */
  addReducers(reducers: Record<string, ActionReducer<any, any>>): void {
    this.reducers = { ...this.reducers, ...reducers };
    this.updateReducers(Object.keys(reducers));
  }

  /**
   * 移除单个 Reducer
   */
  removeReducer(featureKey: string): void {
    this.removeReducers([featureKey]);
  }

  /**
   * 批量移除 Reducers
   */
  removeReducers(featureKeys: string[]): void {
    featureKeys.forEach((key) => {
      this.reducers = omit(this.reducers, key) as any;
    });
    this.updateReducers(featureKeys);
  }

  /**
   * 更新 Reducers：重新计算根 reducer 并发布
   */
  private updateReducers(featureKeys: string[]): void {
    this.next(this.reducerFactory(this.reducers, this.initialState));
    this.dispatcher.next({
      type: UPDATE,
      features: featureKeys,
    } as any);
  }

  /**
   * 销毁时调用，完成 Observable
   */
  destroy(): void {
    this.complete();
  }
}

/**
 * ReducerObservable - Reducer 流的抽象类型
 */
export abstract class ReducerObservable extends Observable<
  ActionReducer<any, any>
> {}
