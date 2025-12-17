---
name: rxjs-store
description: 使用 @sker/store 进行响应式状态管理。当需要创建全局状态、定义 Action/Reducer、或实现复杂状态逻辑时使用。
---

# RxJS 状态管理开发

本项目使用 @sker/store，一个受 NgRx Store 启发的框架无关状态管理库。

## 核心文件

- Store 定义：`packages/store/src/`
- 类型定义：`packages/store/src/models.ts`

## 完整 Feature 模板

```typescript
import {
  createActionGroup,
  createReducer,
  createSelector,
  createFeature,
  createStore,
  emptyProps,
  props,
  on,
} from '@sker/store';

// ========== 1. 定义类型 ==========
interface ItemState {
  items: Item[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

// ========== 2. 创建 Actions ==========
const itemActions = createActionGroup({
  source: 'Item',
  events: {
    'Load Items': emptyProps(),
    'Load Items Success': props<{ items: Item[] }>(),
    'Load Items Failure': props<{ error: string }>(),
    'Select Item': props<{ id: string }>(),
    'Clear Selection': emptyProps(),
  },
});

// ========== 3. 创建 Reducer ==========
const initialState: ItemState = {
  items: [],
  selectedId: null,
  loading: false,
  error: null,
};

const itemReducer = createReducer(
  initialState,
  on(itemActions.loadItems, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(itemActions.loadItemsSuccess, (state, { items }) => ({
    ...state,
    items,
    loading: false,
  })),
  on(itemActions.loadItemsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(itemActions.selectItem, (state, { id }) => ({
    ...state,
    selectedId: id,
  })),
  on(itemActions.clearSelection, (state) => ({
    ...state,
    selectedId: null,
  }))
);

// ========== 4. 创建 Feature ==========
const itemFeature = createFeature({
  name: 'item',
  reducer: itemReducer,
  extraSelectors: ({ selectItems, selectSelectedId }) => ({
    selectSelectedItem: createSelector(
      selectItems,
      selectSelectedId,
      (items, id) => items.find((item) => item.id === id) ?? null
    ),
    selectItemCount: createSelector(
      selectItems,
      (items) => items.length
    ),
  }),
});

// ========== 5. 创建 Store ==========
const store = createStore({
  item: itemFeature.reducer,
});

// ========== 6. 使用 Store ==========
// 订阅状态
store.select(itemFeature.selectItems).subscribe((items) => {
  console.log('Items:', items);
});

// 派发 Action
store.dispatch(itemActions.loadItems());
```

## Action 创建

```typescript
import { createAction, createActionGroup, props, emptyProps } from '@sker/store';

// 单个 Action
const increment = createAction('[Counter] Increment');
const setValue = createAction(
  '[Counter] Set Value',
  props<{ value: number }>()
);

// Action Group（批量创建）
const counterActions = createActionGroup({
  source: 'Counter',
  events: {
    'Increment': emptyProps(),
    'Decrement': emptyProps(),
    'Set Value': props<{ value: number }>(),
  },
});

// 使用
counterActions.increment();           // { type: '[Counter] Increment' }
counterActions.setValue({ value: 5 }); // { type: '[Counter] Set Value', value: 5 }
```

## Reducer 创建

```typescript
import { createReducer, on } from '@sker/store';

const counterReducer = createReducer(
  { count: 0 },
  on(counterActions.increment, (state) => ({ count: state.count + 1 })),
  on(counterActions.decrement, (state) => ({ count: state.count - 1 })),
  on(counterActions.setValue, (state, { value }) => ({ count: value }))
);

// 多个 Action 共享处理函数
on(loginSuccess, registerSuccess, (state, { user }) => ({
  ...state,
  user,
  isAuthenticated: true,
}))
```

## Selector 创建

```typescript
import { createSelector, createFeatureSelector } from '@sker/store';

// Feature 选择器
const selectCounterState = createFeatureSelector<CounterState>('counter');

// 派生选择器
const selectCount = createSelector(
  selectCounterState,
  (state) => state.count
);

// 组合多个选择器
const selectDoubleCount = createSelector(
  selectCount,
  (count) => count * 2
);

// 多输入选择器
const selectTotal = createSelector(
  selectPrice,
  selectQuantity,
  (price, quantity) => price * quantity
);
```

## Store 使用

```typescript
import { createStore } from '@sker/store';

const store = createStore({
  counter: counterReducer,
  user: userReducer,
});

// 直接订阅
store.subscribe((state) => console.log(state));

// 选择切片
store.select(selectCount).subscribe((count) => {
  console.log('Count:', count);
});

// RxJS 管道
store.pipe(
  map(state => state.counter),
  filter(counter => counter.count > 0),
  debounceTime(300)
).subscribe(counter => console.log(counter));

// 派发 Action
store.dispatch(counterActions.increment());

// 动态添加 Reducer
store.addReducer('lazy', lazyReducer);
store.removeReducer('lazy');
```

## Action 命名规范

```typescript
// 格式：[Source] Event Name
const userApiActions = createActionGroup({
  source: 'User API',  // 来源标识
  events: {
    'Load Users': emptyProps(),
    'Load Users Success': props<{ users: User[] }>(),
    'Load Users Failure': props<{ error: string }>(),
  },
});
```

## 不可变更新

```typescript
// ❌ 错误：直接修改状态
on(addItem, (state, { item }) => {
  state.items.push(item);  // 突变！
  return state;
})

// ✅ 正确：返回新对象
on(addItem, (state, { item }) => ({
  ...state,
  items: [...state.items, item],
}))

// ✅ 正确：更新嵌套对象
on(updateUser, (state, { userId, name }) => ({
  ...state,
  users: state.users.map(user =>
    user.id === userId ? { ...user, name } : user
  ),
}))
```

## 运行时检查

```typescript
const store = createStore(reducers, {
  runtimeChecks: {
    strictStateImmutability: true,      // 状态不可变性检查
    strictActionImmutability: true,     // Action 不可变性检查
    strictStateSerializability: false,  // 状态序列化检查
    strictActionSerializability: false, // Action 序列化检查
  },
});
```

## 关键要点

1. **状态不可变**：Reducer 必须返回新对象，禁止直接修改
2. **Action 描述意图**：使用清晰的 `[Source] Event` 格式
3. **Selector 记忆化**：自动缓存，避免不必要的重新计算
4. **类型安全**：完整的 TypeScript 类型推导

## 参考实现

- `packages/store/src/store.ts`
- `packages/store/src/create-store.ts`
- `packages/store/src/action-creator.ts`
- `packages/store/src/reducer-creator.ts`
- `packages/store/src/selector.ts`
- `packages/store/src/feature-creator.ts`
