# Task UI System 迁移指南

## 实现完成

已在 `packages/aui/` 中实现极简 Task UI 系统：

### 新增文件

1. **`src/task-types.ts`** (18 行)
   - `Task` 接口：任务数据结构
   - `Tool` 接口：工具定义
   - `TaskStatus` 类型：任务状态枚举

2. **`src/task-store.ts`** (75 行)
   - `TaskStore` 类：状态管理容器
   - 基于 RxJS `BehaviorSubject`
   - 提供 `addTask`, `updateTask`, `registerTool`, `setCurrentTask` 等方法

3. **`src/task-react.tsx`** (88 行)
   - `TaskProvider`: React Context Provider
   - `useTask`: 获取任务数据
   - `useTaskContext`: 获取 markdown 格式上下文
   - `useTaskActions`: 获取操作方法
   - `useTool`: 获取工具定义

**总计**: 181 行（比目标 185 行更少）

### 示例文件

- `example-task.tsx`: React 使用示例
- `example-task-node.ts`: Node.js 使用示例（已验证）
- `TASK-README.md`: 完整文档

## 与现有 AUI 系统的关系

### 现有 AUI 系统（保留）
- **用途**: 通用 UI 序列化系统
- **代码量**: 252 行
- **核心**: `AuiNode`, `AuiSerializer`, `useAuiNode`
- **适用场景**: 任意 React 组件的序列化

### 新 Task UI 系统
- **用途**: 专门为 Task 管理设计
- **代码量**: 181 行
- **核心**: `Task`, `Tool`, `useTask`, `useTaskContext`
- **适用场景**: AI Agent 任务调度和上下文管理

### 共存策略
两个系统完全独立，可以同时使用：

```tsx
import {
  // 通用 AUI 系统
  useAuiNode,
  useAuiContext,

  // Task UI 系统
  useTask,
  useTaskContext,
  TaskProvider,
} from '@sker/aui';
```

## 设计亮点

### 1. 极简主义
- ❌ 无路由系统（用 `currentTaskId` 代替）
- ❌ 无事件溯源（AI 顺序执行）
- ❌ 无序列化器注册表（直接生成 markdown）
- ❌ 无装饰器（Hooks 足够）
- ✅ 只有必要的功能

### 2. 上下文隔离
```typescript
// 只序列化当前任务及其子任务，节省 token
const context = useTaskContext();
// 输出：
// # 任务标题
// **状态**: ⏳ pending
// ## 子任务
// - [✅] 子任务1
// ## 可用工具
// - addSubtask(...)
```

### 3. Tool 机制
```typescript
registerTool({
  id: 'add-subtask',
  name: 'addSubtask',
  params: [
    { name: 'title', type: 'string', required: true },
  ],
  execute: ({ title }) => {
    // 执行逻辑
  },
});
```

### 4. 响应式更新
基于 RxJS，任何状态变化自动触发 UI 更新：
```typescript
taskStore.updateTask('task-1', { status: 'completed' });
// UI 自动更新，上下文自动重新生成
```

## 使用建议

### 场景 1: 千门八将 Agent 调度
```typescript
const { addTask, setCurrentTask } = useTaskActions();

// orchestrator 创建主任务
addTask({
  id: 'main',
  title: '实现用户认证',
  status: 'pending',
  runner: 'orchestrator',
  childIds: [],
});

// 分配子任务给不同的 agent
addTask({
  id: 'sub-1',
  title: '设计数据库',
  status: 'pending',
  runner: 'architect',
  parentId: 'main',
  childIds: [],
});
```

### 场景 2: AI 上下文生成
```typescript
const context = useTaskContext();
// 将 context 发送给 AI
// AI 可以理解当前任务状态、子任务进度、可用工具
```

### 场景 3: 工具调用
```typescript
// AI 决定调用工具
const tool = useTool('add-subtask');
tool.execute({
  title: '新子任务',
  description: '任务描述',
});
// 状态自动更新，UI 自动刷新
```

## 下一步

1. **集成到 @sker/api**: 在后端使用 TaskStore 管理 Agent 任务
2. **集成到 @sker/app**: 在移动端展示任务进度
3. **集成到 @sker/bigscreen**: 在大屏展示任务看板
4. **扩展工具库**: 添加更多预定义工具（如 `assignRunner`, `splitTask` 等）

## 验证

运行示例验证功能：
```bash
cd packages/aui
npx tsx example-task-node.ts
```

输出示例：
```markdown
# 实现用户认证系统

**状态**: ⏳ pending
**执行者**: orchestrator

需要实现完整的用户认证流程，包括登录、注册、密码重置等功能

## 子任务

- [✅] 设计数据库表结构 (architect)
- [▶️] 实现登录接口 (code-artisan)
- [⏳] 实现注册接口 (未分配)

## 可用工具

- addSubtask(title: string, description: string, runner: string?)
- updateStatus(taskId: string, status: string)
```

---

**代码即艺术，每一行都有存在的理由。**
