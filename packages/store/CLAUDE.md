# @sker/store - 框架无关的状态管理库

受 NgRx Store 启发的响应式状态管理库，基于 RxJS，完全剥离 Angular 依赖，可运行于任何 JavaScript 环境。

## 核心理念

**状态即流 (State as Stream)**
- 状态是 Observable，变化通过 RxJS 流传播
- Action 驱动状态转换，Reducer 纯函数确保可预测性
- Selector 记忆化优化性能，避免不必要的重新计算

**类型即契约 (Types as Contracts)**
- 完整的 TypeScript 类型推导，编译时保障正确性
- Action Creator 自动推导 payload 类型
- Selector 自动推导返回值类型

**简约即力量 (Simplicity is Power)**
- 零 Angular 依赖，核心代码 ~8KB (gzipped)
- 仅包含状态管理核心功能（不包含 Effects、DevTools）
- API 设计与 NgRx Store 保持兼容，学习成本低

---

## 目录结构

```
packages/store/src/
├── models.ts                    # 核心类型定义
├── store.ts                     # Store 类（响应式状态容器）
├── create-store.ts              # Store 工厂函数
├── actions-subject.ts           # ActionsSubject（Action 流）
├── state.ts                     # State 类（状态流管理）
├── reducer-manager.ts           # ReducerManager（动态 Reducer 管理）
├── action-creator.ts            # Action Creator 工厂
├── action-group-creator.ts      # Action Group 工厂（批量创建）
├── reducer-creator.ts           # Reducer Creator（on + createReducer）
├── selector.ts                  # Selector（记忆化选择器）
├── feature-creator.ts           # Feature Creator（自动生成 Selectors）
├── runtime-checks.ts            # 运行时检查（不可变性、序列化）
├── meta-reducers/
│   ├── immutability-reducer.ts  # 不可变性检查 MetaReducer
│   ├── serialization-reducer.ts # 序列化检查 MetaReducer
│   └── utils.ts                 # 运行时检查工具
├── utils.ts                     # 工具函数（combineReducers 等）
└── helpers.ts                   # 辅助函数
```

---

## 核心类说明

### 1. Store - 响应式状态容器

**职责**：
- 继承 `Observable<T>`，可直接订阅状态变化
- 实现 `Observer<Action>`，可接收 Action
- 提供 `select()` 方法选择状态切片
- 支持动态添加/移除 Reducer

**类图**：
```
Observable<T>
    ↑
    |
  Store<T>
    |
    |-- ActionsSubject (Action 流)
    |-- ReducerManager (Reducer 管理)
    |-- StateObservable (状态流)
```

**核心方法**：

```typescript
class Store<T> extends Observable<T> implements Observer<Action> {
  // 派发 Action
  dispatch(action: Action): void

  // 选择状态切片（支持函数或键路径）
  select<K>(mapFn: (state: T) => K): Observable<K>
  select<K extends keyof T>(key: K): Observable<T[K]>

  // 动态管理 Reducer
  addReducer<State>(key: string, reducer: ActionReducer<State>): void
  removeReducer<Key extends keyof T>(key: Key): void

  // 实现 Observer 接口
  next(action: Action): void
  error(err: any): void
  complete(): void
}
```

**使用示例**：
```typescript
const store = createStore({ counter: counterReducer });

// 订阅状态
store.subscribe(state => console.log(state));

// 选择切片（函数选择器）
store.select(state => state.counter.count).subscribe(count => {
  console.log('Count:', count);
});

// 选择切片（键路径）
store.select('counter', 'count').subscribe(count => {
  console.log('Count:', count);
});

// 派发 Action
store.dispatch(increment());
```

---

### 2. ActionsSubject - Action 流

**职责**：
- 继承 `BehaviorSubject<Action>`
- 所有 Action 的中央事件总线
- 初始值为 `{ type: '@sker/store/init' }`

**实现**：
```typescript
export const INIT = '@sker/store/init';

export class ActionsSubject extends BehaviorSubject<Action> {
  constructor() {
    super({ type: INIT });
  }

  // 防止外部意外完成流
  override complete(): void {}

  destroy(): void {
    super.complete();
  }
}
```

**使用场景**：
- `Store.dispatch()` → `ActionsSubject.next()`
- `State` 监听 ActionsSubject，触发 Reducer

---

### 3. State - 状态流管理

**职责**：
- 继承 `BehaviorSubject<T>`
- 监听 ActionsSubject 和 ReducerObservable
- 使用 `scan` operator 累积状态变更

**数据流**：
```
ActionsSubject (Action 流)
    ↓
withLatestFrom(ReducerObservable)
    ↓
scan(reduceState, initialState)  // 累积状态
    ↓
BehaviorSubject.next(newState)   // 发布新状态
```

**核心实现**：
```typescript
export class State<T> extends BehaviorSubject<T> {
  constructor(
    actions$: ActionsSubject,
    reducer$: ReducerObservable,
    scannedActions: ScannedActionsSubject,
    initialState: T
  ) {
    super(initialState);

    // Action 放入队列调度器（异步执行）
    const actionsOnQueue$ = actions$.pipe(observeOn(queueScheduler));

    // 合并最新 Reducer
    const withLatestReducer$ = actionsOnQueue$.pipe(
      withLatestFrom(reducer$)
    );

    // 使用 scan 累积状态
    const stateAndAction$ = withLatestReducer$.pipe(
      scan<[Action, ActionReducer<T>], StateActionPair<T>>(
        reduceState,
        { state: initialState }
      )
    );

    // 订阅并发布新状态
    stateAndAction$.subscribe(({ state, action }) => {
      this.next(state!);
      scannedActions.next(action!);
    });
  }
}
```

**reduceState 函数**：
```typescript
function reduceState<T>(
  stateActionPair: StateActionPair<T>,
  [action, reducer]: [Action, ActionReducer<T>]
): StateActionPair<T> {
  const { state } = stateActionPair;
  return { state: reducer(state, action), action };
}
```

---

### 4. ReducerManager - 动态 Reducer 管理

**职责**：
- 继承 `BehaviorSubject<ActionReducer<any, any>>`
- 管理 Reducer 的动态注册和移除
- 发布合并后的根 Reducer

**核心方法**：
```typescript
export class ReducerManager extends BehaviorSubject<ActionReducer<any, any>> {
  private reducers: ActionReducerMap<any, any>;

  // 添加 Reducer（单个）
  addReducer(key: string, reducer: ActionReducer<any>): void {
    this.addReducers({ [key]: reducer });
  }

  // 批量添加 Reducers
  addReducers(reducers: Record<string, ActionReducer<any>>): void {
    this.reducers = { ...this.reducers, ...reducers };
    this.updateReducers(Object.keys(reducers));
  }

  // 移除 Reducer
  removeReducer(featureKey: string): void {
    this.reducers = omit(this.reducers, featureKey);
    this.updateReducers([featureKey]);
  }

  // 更新：重新计算根 Reducer 并发布
  private updateReducers(featureKeys: string[]): void {
    this.next(this.reducerFactory(this.reducers, this.initialState));
    this.dispatcher.next({ type: UPDATE, features: featureKeys });
  }
}
```

**使用场景**：
- 动态加载模块时添加 Reducer：`store.addReducer('lazy', lazyReducer)`
- 卸载模块时移除 Reducer：`store.removeReducer('lazy')`

---

### 5. Action Creator - Action 工厂函数

**职责**：
- 创建类型安全的 Action Creator
- 支持三种形式：无参数、props、自定义函数

**API**：
```typescript
// 无参数
const logout = createAction('[Auth] Logout');
logout(); // { type: '[Auth] Logout' }

// 带 props
const login = createAction(
  '[Auth] Login',
  props<{ username: string; password: string }>()
);
login({ username: 'admin', password: '123' });
// { type: '[Auth] Login', username: 'admin', password: '123' }

// 自定义函数
const loadUsers = createAction(
  '[Users] Load',
  (page: number, size: number) => ({ payload: { page, size } })
);
loadUsers(1, 20);
// { type: '[Users] Load', payload: { page: 1, size: 20 } }
```

**类型推导**：
```typescript
type ActionCreator<T extends string, C extends Creator> = C & Action<T>;

// 示例
const increment = createAction('[Counter] Increment');
type IncrementAction = ReturnType<typeof increment>;
// => { type: '[Counter] Increment' }
```

**运行时检查**：
- 全局注册表跟踪 Action 类型，防止重复定义
- 开发模式下警告重复的 Action 类型

---

### 6. Action Group Creator - 批量创建 Action

**职责**：
- 批量创建相关 Action，减少样板代码
- 自动生成 camelCase 方法名
- 自动添加 `[Source]` 前缀

**API**：
```typescript
const authApiActions = createActionGroup({
  source: 'Auth API',
  events: {
    'Login Success': props<{ userId: number; token: string }>(),
    'Login Failure': props<{ error: string }>(),
    'Logout Success': emptyProps(),
  },
});

// 生成的 Action Creators
authApiActions.loginSuccess({ userId: 10, token: 'token' });
// { type: '[Auth API] Login Success', userId: 10, token: 'token' }

authApiActions.loginFailure({ error: 'Invalid credentials' });
// { type: '[Auth API] Login Failure', error: 'Invalid credentials' }

authApiActions.logoutSuccess();
// { type: '[Auth API] Logout Success' }
```

**命名转换**：
```
'Login Success' → loginSuccess
'Load Cart'     → loadCart
'Add Item'      → addItem
```

---

### 7. Reducer Creator - Reducer 工厂函数

**职责**：
- 使用 `on()` 函数替代 `switch-case`
- 类型安全的 Reducer 定义
- 支持多个 Action 共享同一个处理函数

**API**：
```typescript
const counterReducer = createReducer(
  { count: 0 },
  on(increment, (state) => ({ count: state.count + 1 })),
  on(decrement, (state) => ({ count: state.count - 1 })),
  on(reset, () => ({ count: 0 })),
  on(setValue, (state, { value }) => ({ count: value }))
);

// 多个 Action 共享处理函数
on(loginSuccess, registerSuccess, (state, { user }) => ({
  ...state,
  user,
  isAuthenticated: true,
}))
```

**on() 函数**：
```typescript
export function on<State, Creators extends readonly ActionCreator[]>(
  ...args: [...creators: Creators, reducer: OnReducer<State, Creators>]
): ReducerTypes<State, Creators> {
  const reducer = args.pop() as OnReducer<State, Creators>;
  const types = args.map(creator => creator.type);
  return { reducer, types };
}
```

**createReducer 实现**：
```typescript
export function createReducer<S>(
  initialState: S,
  ...ons: ReducerTypes<S, ActionCreator[]>[]
): ActionReducer<S> {
  const map = new Map<string, OnReducer<S, ActionCreator[]>>();

  // 构建 type → reducer 映射
  for (const on of ons) {
    for (const type of on.types) {
      map.set(type, on.reducer);
    }
  }

  // 返回 Reducer 函数
  return function (state: S = initialState, action: Action): S {
    const reducer = map.get(action.type);
    return reducer ? reducer(state, action) : state;
  };
}
```

---

### 8. Selector - 记忆化选择器

**职责**：
- 从状态中派生数据
- 自动记忆化，避免不必要的重新计算
- 支持组合选择器

**记忆化策略**：
```typescript
export function defaultMemoize(
  projectionFn: AnyFn,
  isArgumentsEqual = isEqualCheck,
  isResultEqual = isEqualCheck
): MemoizedProjection {
  let lastArguments: IArguments | null = null;
  let lastResult: any = null;

  function memoized(...args): any {
    // 首次调用
    if (!lastArguments) {
      lastResult = projectionFn(...args);
      lastArguments = arguments;
      return lastResult;
    }

    // 参数未变化，返回缓存结果
    if (!isArgumentsChanged(arguments, lastArguments, isArgumentsEqual)) {
      return lastResult;
    }

    // 计算新结果
    const newResult = projectionFn(...args);
    lastArguments = arguments;

    // 结果未变化，返回旧引用（保持引用稳定性）
    if (isResultEqual(lastResult, newResult)) {
      return lastResult;
    }

    lastResult = newResult;
    return newResult;
  }

  return { memoized, reset, setResult, clearResult };
}
```

**API**：
```typescript
// 基础选择器
const selectCounter = (state: AppState) => state.counter;

// 组合选择器（1 个输入）
const selectCount = createSelector(
  selectCounter,
  (counter) => counter.count
);

// 组合选择器（多个输入）
const selectFullName = createSelector(
  selectFirstName,
  selectLastName,
  (first, last) => `${first} ${last}`
);

// Feature 选择器
const selectAuthState = createFeatureSelector<AuthState>('auth');

// 自定义记忆化策略
const deepEqualSelector = createSelectorFactory(
  (projectionFn) => defaultMemoize(projectionFn, deepEqual, deepEqual)
);
```

**记忆化优势**：
- 输入未变化时，不执行投影函数（跳过计算）
- 输出未变化时，返回相同引用（避免触发 React re-render）

---

### 9. Feature Creator - 自动生成 Selectors

**职责**：
- 基于 Feature 名称和 Reducer 自动生成选择器
- 为每个 state 属性生成嵌套选择器
- 支持自定义扩展 selectors

**API**：
```typescript
interface ProductsState {
  products: Product[];
  selectedId: string | null;
}

const productsFeature = createFeature({
  name: 'products',
  reducer: productsReducer,
});

// 自动生成的 selectors
const {
  name,                   // 'products'
  reducer,                // productsReducer
  selectProductsState,    // (state) => state.products
  selectProducts,         // (state) => state.products.products
  selectSelectedId,       // (state) => state.products.selectedId
} = productsFeature;

// 使用 Extra Selectors
const productsFeature = createFeature({
  name: 'products',
  reducer: productsReducer,
  extraSelectors: ({ selectProductsState, selectProducts }) => ({
    selectProductById: (id: string) => createSelector(
      selectProducts,
      (products) => products.find(p => p.id === id)
    ),
    selectProductCount: createSelector(
      selectProducts,
      (products) => products.length
    ),
  }),
});
```

**命名规则**：
- Feature State: `select{CapitalizedName}State`
- 属性: `select{CapitalizedKey}`

---

## RxJS 集成

### 数据流架构

```
                 ┌─────────────────────┐
                 │   ActionsSubject    │
                 │  (BehaviorSubject)  │
                 └──────────┬──────────┘
                            │
                            │ Action
                            ↓
                 ┌──────────────────────┐
                 │  observeOn(queue)    │
                 └──────────┬───────────┘
                            │
                            │
                 ┌──────────↓──────────┐
                 │ withLatestFrom       │
                 │  (ReducerObservable) │
                 └──────────┬───────────┘
                            │
                            │ [Action, Reducer]
                            ↓
                 ┌──────────────────────┐
                 │  scan(reduceState)   │
                 │  累积状态变更        │
                 └──────────┬───────────┘
                            │
                            │ StateActionPair
                            ↓
                 ┌──────────────────────┐
                 │       State          │
                 │  (BehaviorSubject)   │
                 └──────────┬───────────┘
                            │
                            │ T
                            ↓
                 ┌──────────────────────┐
                 │       Store          │
                 │    (Observable)      │
                 └──────────────────────┘
```

### 核心 RxJS Operators

1. **observeOn(queueScheduler)** - 确保 Action 异步处理
2. **withLatestFrom(reducer$)** - 合并最新 Reducer
3. **scan(reduceState, seed)** - 累积状态变更
4. **distinctUntilChanged()** - 去重（用于 select）
5. **pluck(key, ...paths)** - 提取嵌套属性

### Store 作为 Observable

```typescript
class Store<T> extends Observable<T> {
  constructor(
    state$: StateObservable,
    actionsObserver: ActionsSubject,
    reducerManager: ReducerManager
  ) {
    super();
    this.source = state$; // Store 的源就是 State
  }
}
```

**使用方式**：
```typescript
// 直接订阅
store.subscribe(state => console.log(state));

// RxJS 管道
store.pipe(
  map(state => state.counter),
  filter(counter => counter.count > 0),
  debounceTime(300)
).subscribe(counter => console.log(counter));
```

---

## 运行时检查 (Runtime Checks)

### 不可变性检查

**目的**：检测状态/Action 意外突变（开发环境）

```typescript
immutabilityCheckMetaReducer(reducer: ActionReducer<T>): ActionReducer<T> {
  return (state, action) => {
    const frozenState = deepFreeze(state);
    const frozenAction = deepFreeze(action);

    const nextState = reducer(frozenState, frozenAction);

    // 检测突变
    if (nextState !== state && isStateOrActionMutated(state, action)) {
      throw new Error('状态或 Action 被非法修改！');
    }

    return nextState;
  };
}
```

### 序列化检查

**目的**：检测不可序列化对象（开发环境）

```typescript
serializationCheckMetaReducer(reducer: ActionReducer<T>): ActionReducer<T> {
  return (state, action) => {
    const nextState = reducer(state, action);

    // 检测不可序列化对象（函数、Symbol、Date 等）
    if (!isSerializable(nextState)) {
      console.warn('State 包含不可序列化对象！');
    }

    return nextState;
  };
}
```

### 配置

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

---

## 使用示例

### 完整示例：购物车应用

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
interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

// ========== 2. 创建 Actions ==========
const cartActions = createActionGroup({
  source: 'Cart',
  events: {
    'Add Item': props<{ product: Product; quantity: number }>(),
    'Remove Item': props<{ productId: string }>(),
    'Update Quantity': props<{ productId: string; quantity: number }>(),
    'Clear Cart': emptyProps(),
    'Load Cart': emptyProps(),
    'Load Cart Success': props<{ items: CartItem[] }>(),
    'Load Cart Failure': props<{ error: string }>(),
  },
});

// ========== 3. 创建 Reducer ==========
const initialState: CartState = {
  items: [],
  loading: false,
  error: null,
};

const cartReducer = createReducer(
  initialState,
  on(cartActions.addItem, (state, { product, quantity }) => {
    const existingItem = state.items.find(
      (item) => item.product.id === product.id
    );

    if (existingItem) {
      return {
        ...state,
        items: state.items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      };
    }

    return {
      ...state,
      items: [...state.items, { product, quantity }],
    };
  }),
  on(cartActions.removeItem, (state, { productId }) => ({
    ...state,
    items: state.items.filter((item) => item.product.id !== productId),
  })),
  on(cartActions.clearCart, (state) => ({
    ...state,
    items: [],
  })),
  on(cartActions.loadCart, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(cartActions.loadCartSuccess, (state, { items }) => ({
    ...state,
    items,
    loading: false,
  })),
  on(cartActions.loadCartFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);

// ========== 4. 创建 Feature（自动生成 Selectors）==========
const cartFeature = createFeature({
  name: 'cart',
  reducer: cartReducer,
  extraSelectors: ({ selectItems }) => ({
    // 计算总价
    selectTotalPrice: createSelector(
      selectItems,
      (items) => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    ),
    // 计算商品数量
    selectItemCount: createSelector(
      selectItems,
      (items) => items.reduce((sum, item) => sum + item.quantity, 0)
    ),
  }),
});

// ========== 5. 创建 Store ==========
const store = createStore({
  cart: cartFeature.reducer,
});

// ========== 6. 使用 Store ==========
// 订阅状态
store.subscribe((state) => {
  console.log('State:', state);
});

// 使用自动生成的 selectors
store.select(cartFeature.selectItems).subscribe((items) => {
  console.log('Items:', items);
});

store.select(cartFeature.selectTotalPrice).subscribe((total) => {
  console.log('Total:', total);
});

// 派发 Actions
store.dispatch(cartActions.addItem({
  product: { id: '1', name: 'Book', price: 29.99 },
  quantity: 2,
}));

store.dispatch(cartActions.updateQuantity({ productId: '1', quantity: 3 }));
store.dispatch(cartActions.removeItem({ productId: '1' }));
store.dispatch(cartActions.clearCart());
```

---

## 与 NgRx Store 的对比

| 特性 | NgRx Store | @sker/store | 说明 |
|------|-----------|------------|------|
| **依赖** | Angular | 无 | @sker/store 可在任何 JS 环境运行 |
| **DI 系统** | Angular DI | 无 | 需手动管理 Store 实例 |
| **Store 类** | ✅ | ✅ | 完全兼容 |
| **Action Creator** | ✅ | ✅ | API 完全一致 |
| **Reducer Creator** | ✅ | ✅ | API 完全一致 |
| **Selector** | ✅ | ✅ | API 完全一致 |
| **Feature Creator** | ✅ | ✅ | API 完全一致 |
| **Action Group** | ✅ | ✅ | API 完全一致 |
| **Runtime Checks** | ✅ | ✅ | 支持不可变性和序列化检查 |
| **Meta Reducers** | ✅ | ✅ | 完全支持 |
| **动态 Reducers** | ✅ | ✅ | `addReducer/removeReducer` |
| **Effects** | @ngrx/effects | ❌ | 不包含（可用 RxJS 实现） |
| **DevTools** | @ngrx/store-devtools | ❌ | 不包含 |
| **Router Store** | @ngrx/router-store | ❌ | 不包含 |
| **Entity** | @ngrx/entity | ❌ | 不包含 |

### 迁移建议

**从 NgRx Store 迁移**：
1. 修改 import 路径：`@ngrx/store` → `@sker/store`
2. 使用 `createStore()` 替代 `provideStore()`
3. 手动管理 Store 实例（不使用 DI）

**从 Redux 迁移**：
1. 使用 `createAction()` 替代手写 Action Creator
2. 使用 `createReducer() + on()` 替代 `switch-case`
3. 使用 `createSelector()` 添加记忆化

---

## 最佳实践

### 1. Action 命名约定

```typescript
// 格式：[Source] Event Name
const userActions = createActionGroup({
  source: 'User API',
  events: {
    'Load Users': emptyProps(),
    'Load Users Success': props<{ users: User[] }>(),
    'Load Users Failure': props<{ error: string }>(),
  },
});
```

### 2. Reducer 不可变更新

```typescript
// ❌ 错误：直接修改状态
on(addItem, (state, { item }) => {
  state.items.push(item); // 突变！
  return state;
})

// ✅ 正确：返回新对象
on(addItem, (state, { item }) => ({
  ...state,
  items: [...state.items, item],
}))
```

### 3. Selector 组合

```typescript
// 基础选择器
const selectUserState = createFeatureSelector<UserState>('user');
const selectCurrentUser = createSelector(
  selectUserState,
  (state) => state.currentUser
);

// 组合选择器
const selectUserName = createSelector(
  selectCurrentUser,
  (user) => user?.name
);

const selectIsAdmin = createSelector(
  selectCurrentUser,
  (user) => user?.role === 'admin'
);
```

### 4. Feature 模块化

```typescript
// user.feature.ts
export const userFeature = createFeature({
  name: 'user',
  reducer: userReducer,
  extraSelectors: ({ selectCurrentUser }) => ({
    selectIsAuthenticated: createSelector(
      selectCurrentUser,
      (user) => !!user
    ),
  }),
});

// app.ts
const store = createStore({
  user: userFeature.reducer,
});
```

---

## 关键文件路径

- **Store 核心**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/store.ts`
- **Store 工厂**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/create-store.ts`
- **Action Creator**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/action-creator.ts`
- **Reducer Creator**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/reducer-creator.ts`
- **Selector**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/selector.ts`
- **Feature Creator**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/feature-creator.ts`
- **State 管理**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/state.ts`
- **Reducer Manager**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/reducer-manager.ts`
- **集成测试**: `C:/Users/imeep/Desktop/shopify/weibo-pro/packages/store/src/integration.test.ts`

---

## 代码即艺术

**状态管理的禅意**：
- 状态是不可变的，变化通过纯函数完成
- Action 描述意图，Reducer 定义转换
- Selector 延迟计算，记忆化避免浪费
- RxJS 流动的数据，优雅的响应式编程

**设计原则**：
- 单一职责：Store 管理状态，ActionsSubject 管理 Action 流
- 可预测性：纯函数 Reducer，确保相同输入产生相同输出
- 可扩展性：Meta Reducers、动态 Reducers 支持插件化
- 类型安全：TypeScript 类型推导，编译时捕获错误
