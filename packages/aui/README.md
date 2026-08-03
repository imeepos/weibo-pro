# @sker/aui

AI-first UI 系统：UI 本身就是 AI 的上下文（UI as Context），组件自动序列化为 AI 可理解的结构化数据。

## 核心职责

- UI 节点自动序列化为结构化数据：组件状态、属性、层级关系成为 AI 输入，无需手写上下文描述
- 类型安全的序列化器注册表（`AuiContextSerializer`），支持内置组件描述器与自定义序列化策略
- 基于 RxJS 的响应式状态管理（`AuiStore`，BehaviorSubject），组件卸载自动清理
- React 集成：`AuiProvider` + 3 个核心 Hook（`useAui` / `useAuiNode` / `useAuiContext`）
- 组件装饰器 `withAui` / `createAuiSerializer`，渐进式增强，零运行时开销
- Task UI 系统：`TaskStore` / `TaskProvider` / `useTask` / `useTool` / `useTaskContext`，将任务流也暴露给 AI
- AI 工具执行器：`AuiToolExecutor` 从 UI 节点声明中提取工具定义并执行

## 目录结构

```
packages/aui/
├── src/
│   ├── index.ts                       # 导出入口
│   ├── types.ts                       # AuiNode / AuiMetadata / AuiSerializer / ToolDefinition 等核心类型
│   ├── store.ts                       # AuiStore：基于 RxJS BehaviorSubject 的节点状态管理
│   ├── serializer.ts                  # AuiContextSerializer 注册表 + 内置组件描述器（Button/Form/Input...）
│   ├── react.tsx                      # React 集成：AuiProvider / useAui / useAuiNode / useAuiContext
│   ├── decorators.ts                  # withAui HOC + createAuiSerializer 工厂
│   ├── tool.ts                        # AuiToolExecutor：从节点声明中执行 AI 工具
│   ├── task-types.ts                  # Task / Tool / TaskStatus 任务类型
│   ├── task-store.ts                  # TaskStore：任务树与工具注册（RxJS）
│   └── task-react.tsx                 # TaskProvider / useTask / useTool / useTaskContext / useTaskActions
├── example*.tsx / example-*.ts        # 使用示例
├── MIGRATION.md                       # 迁移说明
├── TASK-README.md                     # Task UI 系统说明
├── package.json
├── tsconfig.json
└── tsup.config.ts                     # 构建配置
```

## 边界

- **✅ 负责**：UI 节点到 AI 上下文的序列化；响应式状态管理；React 绑定与 Hooks；任务流/Task UI 的 AI 暴露；AI 工具执行
- **❌ 不负责**：与具体 LLM 提供商的网络通信；组件样式/主题体系；跨框架渲染器（Vue/Svelte 适配器为未来规划）
- **对外依赖**：`@sker/store`（状态管理）；外部：`rxjs`；peer：`react`（^19）
- **被谁依赖**：当前未被其他 `@sker/*` 包/应用引用（仅包内示例使用；作为 UI 侧通用库供上层应用接入）

## 使用示例

```tsx
import { AuiProvider, useAuiNode, useAuiContext } from '@sker/aui';

function App() {
  return (
    <AuiProvider>
      <Button label="登录" />
    </AuiProvider>
  );
}

function Button({ label }) {
  useAuiNode('button-1', 'Button', { label }, { importance: 'high', description: '主要操作按钮' });
  return <button>{label}</button>;
}

function AiAssistant() {
  const context = useAuiContext({ page: 'dashboard' }); // JSON 字符串，可直接发给 AI
  return <div>{context}</div>;
}
```

## API

### Hooks

- `useAui()` - 获取 AUI 上下文（store + serializer）
- `useAuiNode(id, type, props?, metadata?)` - 注册 UI 节点
- `useAuiContext(metadata?)` - 获取序列化的 AI 上下文

### 设计原则

1. **存在即合理** - 每个 API 都有不可替代的用途
2. **优雅即简约** - 代码自解释，无冗余功能
3. **类型即契约** - 完整的 TypeScript 类型推导
4. **性能即艺术** - 基于 RxJS 的响应式架构，零不必要的重渲染
