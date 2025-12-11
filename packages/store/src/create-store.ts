import type {
  Action,
  ActionReducer,
  ActionReducerMap,
  MetaReducer,
} from './models';
import { ActionsSubject } from './actions-subject';
import { ReducerManager } from './reducer-manager';
import { State, ScannedActionsSubject } from './state';
import { Store } from './store';
import { combineReducers, createReducerFactory } from './utils';
import { createRuntimeCheckMetaReducers } from './runtime-checks';

/**
 * StoreConfig - Store 配置选项
 */
export interface StoreConfig<T, V extends Action = Action> {
  /**
   * 初始状态
   */
  initialState?: Partial<T>;

  /**
   * MetaReducers（高阶 reducer，用于日志、持久化等）
   */
  metaReducers?: MetaReducer<T, V>[];

  /**
   * 运行时检查配置
   *
   * 在开发环境中自动启用以下检查（可通过配置覆盖）：
   * - strictStateImmutability: true - 检测状态突变
   * - strictActionImmutability: true - 检测 Action 突变
   * - strictStateSerializability: false - 检测状态不可序列化对象
   * - strictActionSerializability: false - 检测 Action 不可序列化对象
   */
  runtimeChecks?: {
    strictStateImmutability?: boolean;
    strictActionImmutability?: boolean;
    strictStateSerializability?: boolean;
    strictActionSerializability?: boolean;
    strictActionWithinNgZone?: boolean;
    strictActionTypeUniqueness?: boolean;
  };
}

/**
 * createStore - 创建 Store 实例
 *
 * @param reducers - Reducer 映射表或单一 Reducer
 * @param config - Store 配置
 * @returns Store 实例
 *
 * @example
 * ```typescript
 * const store = createStore({
 *   counter: counterReducer,
 *   user: userReducer,
 * }, {
 *   initialState: { counter: { count: 0 } },
 * });
 *
 * store.dispatch(increment());
 * store.select(state => state.counter.count).subscribe(console.log);
 * ```
 */
export function createStore<T, V extends Action = Action>(
  reducers: ActionReducerMap<T, V> | ActionReducer<T, V>,
  config: StoreConfig<T, V> = {}
): Store<T> {
  const {
    initialState = {} as Partial<T>,
    metaReducers = [],
    runtimeChecks,
  } = config;

  // 1. 创建 ActionsSubject（Action 流）
  const actionsSubject = new ActionsSubject();

  // 2. 创建 ScannedActionsSubject（处理后的 Action 流）
  const scannedActionsSubject = new ScannedActionsSubject();

  // 3. 合并用户 MetaReducers 和运行时检查 MetaReducers
  const runtimeCheckMetaReducers = createRuntimeCheckMetaReducers<T, V>(runtimeChecks);
  const allMetaReducers = [...runtimeCheckMetaReducers, ...metaReducers];

  // 4. 创建 ReducerFactory
  const reducerFactory = createReducerFactory(
    (reducerMap: ActionReducerMap<T, V>) => combineReducers(reducerMap),
    allMetaReducers
  );

  // 5. 规范化 reducers
  const reducerMap: ActionReducerMap<T, V> =
    typeof reducers === 'function'
      ? ({ root: reducers } as any)
      : reducers;

  // 6. 创建 ReducerManager
  const reducerManager = new ReducerManager(
    actionsSubject,
    initialState,
    reducerMap,
    reducerFactory
  );

  // 7. 创建 State（状态流）
  const state = new State<T>(
    actionsSubject,
    reducerManager,
    scannedActionsSubject,
    initialState as T
  );

  // 8. 创建 Store
  const store = new Store<T>(state, actionsSubject, reducerManager);

  return store;
}
