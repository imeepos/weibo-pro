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
