# @sker/aui

AI-first UI system where UI itself is AI context.

## 核心理念

**UI 即上下文 (UI as Context)**
- UI 节点自动序列化为 AI 可理解的结构化数据
- 组件状态、属性、层级关系都成为 AI 的输入
- 无需手动编写上下文描述，UI 本身就是最准确的上下文

**极简设计 (Minimal Design)**
- 核心代码 < 200 行
- 零运行时开销（可选注册）
- 类型安全的序列化器系统

## 架构

```
@sker/aui
├── types.ts        # 核心类型定义（AuiNode, AuiSerializer）
├── store.ts        # 状态管理（基于 RxJS）
├── serializer.ts   # 序列化器注册表
├── react.tsx       # React 集成（Provider, Hooks）
└── decorators.ts   # 组件装饰器
```

## 使用示例

### 1. 基础设置

```tsx
import { AuiProvider } from '@sker/aui';

function App() {
  return (
    <AuiProvider>
      <YourApp />
    </AuiProvider>
  );
}
```

### 2. 注册 UI 节点

```tsx
import { useAuiNode } from '@sker/aui';

function Button({ label, onClick }) {
  useAuiNode('button-1', 'Button', { label }, {
    importance: 'high',
    description: '主要操作按钮'
  });

  return <button onClick={onClick}>{label}</button>;
}
```

### 3. 获取 AI 上下文

```tsx
import { useAuiContext } from '@sker/aui';

function AiAssistant() {
  const context = useAuiContext({ page: 'dashboard' });

  // context 是 JSON 字符串，可直接发送给 AI
  const response = await sendToAI(context);

  return <div>{response}</div>;
}
```

### 4. 自定义序列化器

```tsx
import { createAuiSerializer, contextSerializer } from '@sker/aui';

const formSerializer = createAuiSerializer(
  (form) => ({
    id: form.id,
    type: 'Form',
    props: {
      fields: form.fields.map(f => f.name),
      values: form.values,
    },
    metadata: {
      importance: 'high',
      description: `表单：${form.title}`,
    },
  })
);

contextSerializer.register('Form', formSerializer);
```

### 5. 组件装饰器

```tsx
import { withAui, createAuiSerializer } from '@sker/aui';

const DataTable = withAui(
  ({ data, columns }) => {
    return <table>...</table>;
  },
  {
    type: 'DataTable',
    serializer: createAuiSerializer((props) => ({
      id: 'data-table',
      type: 'DataTable',
      props: {
        rowCount: props.data.length,
        columns: props.columns.map(c => c.key),
      },
    })),
  }
);
```

## API

### Types

```typescript
interface AuiNode {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: AuiNode[];
  metadata?: AuiMetadata;
}

interface AuiMetadata {
  label?: string;
  description?: string;
  importance?: 'high' | 'medium' | 'low';
  context?: Record<string, unknown>;
}

interface AuiSerializer<T> {
  serialize(node: T): AuiNode | null;
  deserialize?(node: AuiNode): T | null;
}
```

### Hooks

- `useAui()` - 获取 AUI 上下文（store + serializer）
- `useAuiNode(id, type, props?, metadata?)` - 注册 UI 节点
- `useAuiContext(metadata?)` - 获取序列化的 AI 上下文

### Store

```typescript
class AuiStore {
  state: AuiState;
  state$: Observable<AuiState>;

  registerNode(node: AuiNode, parentId?: string): void;
  unregisterNode(id: string): void;
  updateNode(id: string, updates: Partial<AuiNode>): void;
  getNode(id: string): AuiNode | undefined;
  getRootNodes(): AuiNode[];
  clear(): void;
  toContext(metadata?: Record<string, unknown>): AuiContext;
}
```

### Serializer

```typescript
class AuiContextSerializer {
  register<T>(type: string, serializer: AuiSerializer<T>): void;
  unregister(type: string): void;
  serialize(type: string, value: unknown): AuiNode | null;
  deserialize<T>(node: AuiNode): T | null;
  serializeContext(nodes: AuiNode[], metadata?: Record<string, unknown>): string;
  deserializeContext(json: string): AuiContext | null;
}
```

## 设计原则

1. **存在即合理** - 每个 API 都有不可替代的用途
2. **优雅即简约** - 代码自解释，无冗余功能
3. **类型即契约** - 完整的 TypeScript 类型推导
4. **性能即艺术** - 基于 RxJS 的响应式架构，零不必要的重渲染

## 依赖

- `@sker/store` - 状态管理
- `rxjs` - 响应式编程
- `react` (peer) - UI 框架
