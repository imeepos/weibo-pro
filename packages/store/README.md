# @sker/store

框架无关的状态管理库，基于 NgRx Store 核心逻辑，完全剥离 Angular 依赖，可运行于任何 JavaScript 环境。

## 特性

✅ **零 Angular 依赖** - 可在 Node.js、浏览器、任何框架中使用
✅ **类型安全** - 完整的 TypeScript 类型支持
✅ **记忆化选择器** - 高性能状态派生
✅ **Redux 风格** - 熟悉的 Action/Reducer 模式
✅ **轻量级** - 仅 ~8KB (gzipped)

## 安装

```bash
pnpm add @sker/store
```

## 快速开始

### 1. 定义 Action

```typescript
import { createAction, props } from '@sker/store';

export const increment = createAction('[Counter] Increment');
export const decrement = createAction('[Counter] Decrement');
export const setValue = createAction(
  '[Counter] Set Value',
  props<{ value: number }>()
);
```

### 2. 创建 Reducer

```typescript
import { createReducer, on } from '@sker/store';

interface CounterState {
  count: number;
}

const initialState: CounterState = { count: 0 };

export const counterReducer = createReducer(
  initialState,
  on(increment, (state) => ({ count: state.count + 1 })),
  on(decrement, (state) => ({ count: state.count - 1 })),
  on(setValue, (state, { value }) => ({ count: value }))
);
```

### 3. 创建选择器

```typescript
import { createSelector, createFeatureSelector } from '@sker/store';

// Feature Selector
const selectCounter = createFeatureSelector<CounterState>('counter');

// 记忆化选择器
const selectCount = createSelector(
  selectCounter,
  (state) => state.count
);

const selectDoubleCount = createSelector(
  selectCount,
  (count) => count * 2 // 只有 count 变化时才重新计算
);
```

### 4. 使用 Reducer

```typescript
let state = counterReducer(undefined, { type: '@@INIT' });
console.log(state); // { count: 0 }

state = counterReducer(state, increment());
console.log(state); // { count: 1 }

state = counterReducer(state, setValue({ value: 100 }));
console.log(state); // { count: 100 }
```

## 核心 API

### Action Creator

```typescript
// 无参数 Action
const logout = createAction('[Auth] Logout');

// 带参数 Action
const login = createAction(
  '[Auth] Login',
  props<{ username: string; password: string }>()
);

// 自定义函数
const loadUsers = createAction(
  '[Users] Load',
  (page: number) => ({ payload: { page } })
);
```

### Reducer Creator

```typescript
const reducer = createReducer(
  initialState,
  on(action1, action2, (state, action) => {
    // 处理多个 action
    return newState;
  }),
  on(action3, (state) => {
    // 处理单个 action
    return newState;
  })
);
```

### Selector

```typescript
// 基础选择器
const selectUser = (state: AppState) => state.user;

// 组合选择器
const selectUserName = createSelector(
  selectUser,
  (user) => user.name
);

// 多输入选择器
const selectFullName = createSelector(
  selectUserName,
  selectLastName,
  (first, last) => `${first} ${last}`
);

// Feature 选择器
const selectAuthFeature = createFeatureSelector<AuthState>('auth');
```

## 与 NgRx Store 的区别

| 特性 | NgRx Store | @sker/store |
|-----|-----------|------------|
| Angular 依赖 | ✅ 必须 | ❌ 无 |
| DI 系统 | Angular DI | 无（需自己实现） |
| Store 类 | ✅ | ❌（待实现） |
| Effects | ✅ | ❌（不包含） |
| DevTools | ✅ | ❌（不包含） |
| Action/Reducer | ✅ | ✅ |
| Selector | ✅ | ✅ |
| 类型安全 | ✅ | ✅ |

## 迁移指南

### 从 NgRx Store 迁移

```typescript
// Before (NgRx)
import { createAction, createReducer, createSelector } from '@ngrx/store';

// After (@sker/store)
import { createAction, createReducer, createSelector } from '@sker/store';
```

核心 API 完全兼容，只需修改 import 路径即可！

### 从原生 Redux 迁移

```typescript
// Before (Redux)
const increment = () => ({ type: 'INCREMENT' });
const reducer = (state = 0, action) => {
  switch (action.type) {
    case 'INCREMENT': return state + 1;
    default: return state;
  }
};

// After (@sker/store)
const increment = createAction('[Counter] Increment');
const reducer = createReducer(
  0,
  on(increment, (state) => state + 1)
);
```

## 高级用法

### 自定义记忆化策略

```typescript
import { createSelectorFactory, defaultMemoize } from '@sker/store';

// 深度比较
const deepEqualSelector = createSelectorFactory(
  (projectionFn) => defaultMemoize(projectionFn, deepEqual, deepEqual)
);
```

### Meta Reducer

```typescript
import { ActionReducer, Action } from '@sker/store';

export function logger<T>(reducer: ActionReducer<T>): ActionReducer<T> {
  return (state, action) => {
    console.log('state before:', state);
    console.log('action:', action);
    const nextState = reducer(state, action);
    console.log('state after:', nextState);
    return nextState;
  };
}

// 使用
const wrappedReducer = logger(counterReducer);
```

## 运行测试

```bash
pnpm test
```

## 验证示例

```bash
pnpm build
node -r tsx/cjs src/verify.ts
```

## 许可证

MIT

## 致谢

本库基于 [NgRx Store](https://ngrx.io/guide/store) 核心逻辑，感谢 NgRx 团队的出色工作。
