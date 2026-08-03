# @sker/store

框架无关的响应式状态管理库，基于 NgRx Store 核心逻辑，完全剥离 Angular 依赖，可运行于任何 JavaScript 环境。

## 核心职责

- **Redux 风格状态管理**：Action / Reducer / Selector 模式，可预测的状态变更
- **框架无关**：零 Angular 依赖，可运行于 Node.js、浏览器、React/Vue 等任何环境
- **响应式 Store**：基于 RxJS 的 `Store` 类，状态变化通过 Observable 流传播
- **记忆化选择器**：`createSelector` / `createFeatureSelector` 高性能状态派生
- **Action 工具链**：`createAction` / `createActionGroup` 类型安全地定义 Action 与 payload
- **运行时检查**：不可变性检查、序列化检查（meta-reducers）
- **轻量级**：仅 ~8KB (gzipped)，不含 Effects 与 DevTools

## 目录结构

```
src/
├── index.ts                    # 统一导出
├── models.ts                   # 核心类型定义（Action、ActionReducer、MetaReducer 等）
├── store.ts                    # Store 类（响应式状态容器，含 select）
├── create-store.ts             # createStore 工厂函数（含 StoreConfig）
├── actions-subject.ts          # ActionsSubject / INIT（Action 流）
├── state.ts                    # State / StateObservable / ScannedActionsSubject（状态流管理）
├── reducer-manager.ts          # ReducerManager / UPDATE（动态 Reducer 管理）
├── action-creator.ts           # createAction / props / union 工厂
├── action-group-creator.ts     # createActionGroup 批量创建
├── reducer-creator.ts          # createReducer + on
├── selector.ts                 # createSelector / createFeatureSelector / 记忆化
├── feature-creator.ts          # createFeature（自动生成 Feature Selectors）
├── runtime-checks.ts           # 运行时检查配置与 meta-reducer 创建
├── meta-reducers/              # 内置 MetaReducers
│   ├── immutability-reducer.ts # 不可变性检查
│   ├── serialization-reducer.ts# 序列化检查
│   └── utils.ts                # 运行时检查工具
├── utils.ts                    # combineReducers、compose 等工具
├── helpers.ts                  # capitalize、uncapitalize、assertDefined
└── *.test.ts                   # 各模块测试
```

## 快速开始

```typescript
import { createAction, props, createReducer, on, createSelector, createFeatureSelector } from '@sker/store';

// 1. 定义 Action
export const increment = createAction('[Counter] Increment');
export const setValue = createAction('[Counter] Set Value', props<{ value: number }>());

// 2. 创建 Reducer
const initialState = { count: 0 };
const counterReducer = createReducer(
  initialState,
  on(increment, (state) => ({ count: state.count + 1 })),
  on(setValue, (state, { value }) => ({ count: value }))
);

// 3. 创建记忆化 Selector
const selectCounter = createFeatureSelector<typeof initialState>('counter');
const selectCount = createSelector(selectCounter, (state) => state.count);
```

### 使用 Store

```typescript
import { createStore } from '@sker/store';

const store = createStore(counterReducer, { name: 'counter' });
store.dispatch(increment());
store.select(selectCount).subscribe((count) => console.log(count));
```

## 核心 API

- **Action**：`createAction(type)` / `createAction(type, props<T>())` / `createActionGroup(...)` / `union()`
- **Reducer**：`createReducer(initialState, on(action, reducer))`
- **Selector**：`createSelector(...inputs, projectFn)` / `createFeatureSelector<T>(name)` / `createSelectorFactory` / `defaultMemoize`
- **Store**：`createStore(reducer, config?)`、`store.dispatch(action)`、`store.select(selector)`、`Store` 类、`select` 操作符
- **MetaReducer**：`immutabilityCheckMetaReducer` / `serializationCheckMetaReducer`

## 边界

- **✅ 负责**：Action / Reducer / Selector 核心状态管理原语；响应式 Store 与状态流；记忆化派生与 Feature 管理；运行时不可变/序列化检查
- **❌ 不负责**：不含 Effects（副作用编排）；不含 DevTools；不含框架绑定（React/Vue 适配）；依赖注入由外部（`@sker/core`）配合
- **对外依赖**：外部依赖 `rxjs`、`tslib`；无 `@sker/*` 运行时依赖
- **被谁依赖**：`packages/aui`（UI 组件库的状态管理）
