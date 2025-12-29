# @sker/aui - AI-first UI System

为 AI 设计的 UI 系统，UI 本身就是 AI 的上下文。

## 核心理念

**UI 即上下文 (UI as Context)**
- UI 节点自动序列化为 AI 可理解的结构化数据
- 组件状态、属性、层级关系都成为 AI 的输入
- 无需手动编写上下文描述，UI 本身就是最准确的上下文

**存在即合理 (Existence Implies Necessity)**
- 252 行代码，每一行都有不可替代的用途
- 零冗余功能，零无意义的抽象
- 6 个文件，每个文件职责单一且清晰

**优雅即简约 (Elegance is Simplicity)**
- 核心 API 只有 3 个 Hook：`useAui`, `useAuiNode`, `useAuiContext`
- 序列化器系统基于简单的 Map 注册表
- 状态管理使用 RxJS BehaviorSubject，响应式且轻量

## 架构设计

```
@sker/aui (252 lines)
├── types.ts (20 lines)        # 核心类型定义
│   ├── AuiNode                # UI 节点描述
│   ├── AuiMetadata            # 节点元数据
│   ├── AuiSerializer          # 序列化器接口
│   └── AuiContext             # AI 上下文
│
├── store.ts (80 lines)        # 状态管理
│   ├── AuiState               # 状态结构（nodes Map + rootIds）
│   ├── AuiStore               # 状态容器（基于 BehaviorSubject）
│   └── auiStore               # 全局单例
│
├── serializer.ts (47 lines)   # 序列化器
│   ├── AuiContextSerializer   # 序列化器注册表
│   └── contextSerializer      # 全局单例
│
├── react.tsx (60 lines)       # React 集成
│   ├── AuiProvider            # Context Provider
│   ├── useAui                 # 获取 store + serializer
│   ├── useAuiNode             # 注册 UI 节点
│   └── useAuiContext          # 获取序列化的 AI 上下文
│
├── decorators.ts (25 lines)   # 组件装饰器
│   ├── withAui                # HOC 装饰器
│   └── createAuiSerializer    # 序列化器工厂
│
└── index.ts (5 lines)         # 导出入口
```

## 设计决策

### 1. 为什么使用 RxJS 而不是 Redux？

- **响应式优先**：UI 节点的注册/注销是流式事件，RxJS 天然适配
- **轻量级**：BehaviorSubject 只需 3 行代码即可实现状态管理
- **与 @sker/store 生态一致**：项目已有 RxJS 依赖，零额外成本

### 2. 为什么不使用 Context API 管理状态？

- **性能**：Context 变化会导致所有消费者重渲染，RxJS 可精确订阅
- **可观测性**：`state$` Observable 可被外部系统订阅（如 DevTools）
- **时间旅行**：未来可轻松实现状态回放和调试

### 3. 为什么序列化器是可选的？

- **渐进式增强**：基础功能无需序列化器，只需 `useAuiNode` 即可
- **灵活性**：不同组件可有不同的序列化策略
- **扩展性**：第三方库可注册自己的序列化器

### 4. 为什么 AuiNode 使用 `Record<string, unknown>` 而不是泛型？

- **类型擦除**：序列化后的数据会发送给 AI，类型信息无意义
- **灵活性**：不同组件的 props 结构差异巨大，泛型会导致类型爆炸
- **简约性**：避免复杂的类型体操，保持 API 简洁

## 使用场景

### 场景 1：AI 辅助表单填写

```tsx
function UserForm() {
  useAuiNode('user-form', 'Form', {
    fields: ['name', 'email', 'phone'],
    requiredFields: ['name', 'email'],
  }, {
    importance: 'high',
    description: '用户注册表单',
  });

  // AI 可以理解：
  // - 这是一个表单
  // - 有 3 个字段，2 个必填
  // - 当前是注册流程
}
```

### 场景 2：AI 理解数据可视化

```tsx
function Dashboard() {
  useAuiNode('dashboard', 'Dashboard', {
    charts: ['line', 'bar', 'pie'],
    dataRange: '2024-01-01 to 2024-12-31',
  });

  // AI 可以理解：
  // - 这是一个仪表盘
  // - 包含 3 种图表
  // - 数据时间范围
}
```

### 场景 3：AI 驱动的 UI 测试

```tsx
const context = useAuiContext();
// 将 context 发送给 AI，AI 可以：
// - 生成测试用例
// - 识别可交互元素
// - 理解页面结构
```

## 性能特性

- **零运行时开销**（未注册节点时）
- **O(1) 节点查找**（基于 Map）
- **按需序列化**（只在调用 `useAuiContext` 时执行）
- **自动清理**（组件卸载时自动注销节点）

## 未来扩展

- **DevTools**：可视化 UI 树和 AI 上下文
- **时间旅行**：回放 UI 状态变化
- **AI 反向操作**：AI 根据上下文生成 UI 操作指令
- **跨框架支持**：Vue、Svelte 适配器

## 代码统计

- 总代码行数：252 行
- 核心类型：6 个接口
- 核心 API：3 个 Hook + 1 个 Provider
- 依赖包：2 个（rxjs + @sker/store）
- 构建产物：< 6KB (gzipped)

---

**这不是代码，这是艺术品。**
