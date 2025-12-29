# Task UI System

极简的 Task 管理系统，专为 AI 上下文设计。

## 核心特性

- **上下文隔离**: 每个 Task 独立序列化，节省 token
- **树形结构**: 主任务 + 子任务层级关系
- **响应式**: 基于 RxJS，自动更新
- **Tool 机制**: 按钮即工具调用
- **Markdown 输出**: 直接给 AI 使用

## 代码量

- `task-types.ts`: 18 行（类型定义）
- `task-store.ts`: 72 行（状态管理）
- `task-react.tsx`: 95 行（React Hooks）
- **总计**: 185 行

## API

### Hooks

```tsx
// 获取当前任务
const task = useTask();

// 获取指定任务
const task = useTask('task-id');

// 获取 markdown 格式的上下文
const context = useTaskContext();

// 获取操作方法
const { addTask, updateTask, registerTool, setCurrentTask } = useTaskActions();

// 获取工具
const tool = useTool('tool-id');
```

### 类型

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  runner?: string;
  parentId?: string;
  childIds: string[];
}

interface Tool {
  id: string;
  name: string;
  params: Array<{ name: string; type: string; required?: boolean }>;
  execute: (params: Record<string, any>) => void | Promise<void>;
}
```

## 使用示例

```tsx
import { TaskProvider, useTask, useTaskContext, useTaskActions } from '@sker/aui';

function TaskView() {
  const task = useTask();
  const context = useTaskContext();
  const { updateTask } = useTaskActions();

  return (
    <div>
      <h2>{task.title}</h2>
      <button onClick={() => updateTask(task.id, { status: 'running' })}>
        开始
      </button>
      <pre>{context}</pre>
    </div>
  );
}

function App() {
  const { addTask, setCurrentTask, registerTool } = useTaskActions();

  useEffect(() => {
    // 创建主任务
    addTask({
      id: 'main',
      title: '实现用户认证',
      description: '需要实现登录、注册、密码重置',
      status: 'pending',
      childIds: [],
    });

    setCurrentTask('main');

    // 注册工具
    registerTool({
      id: 'add-subtask',
      name: 'addSubtask',
      params: [
        { name: 'title', type: 'string', required: true },
        { name: 'description', type: 'string', required: true },
      ],
      execute: ({ title, description }) => {
        addTask({
          id: `task-${Date.now()}`,
          title: title as string,
          description: description as string,
          status: 'pending',
          parentId: 'main',
          childIds: [],
        });
      },
    });
  }, []);

  return (
    <TaskProvider>
      <TaskView />
    </TaskProvider>
  );
}
```

## Markdown 输出示例

```markdown
# 实现用户认证

**状态**: ⏳ pending
**执行者**: orchestrator

需要实现登录、注册、密码重置功能

## 子任务

- [⏳] 设计数据库表结构
- [▶️] 实现登录接口
- [⏳] 实现注册接口

## 可用工具

- addSubtask(title: string, description: string)
- updateStatus(status: string)
```

## 设计原则

1. **存在即合理**: 每一行代码都有不可替代的用途
2. **零冗余**: 不需要路由、不需要事件溯源、不需要装饰器
3. **上下文优先**: UI 本身就是 AI 的上下文
4. **极简主义**: 185 行实现完整功能

## 与现有 AUI 系统的关系

- 现有 AUI: 通用 UI 序列化系统（252 行）
- Task UI: 专门为 Task 管理设计（185 行）
- 两者共存，互不干扰
- 共享 RxJS 依赖和设计理念
