import { taskStore } from './src/task-store';

// 创建主任务
taskStore.addTask({
  id: 'main-task',
  title: '实现用户认证系统',
  description: '需要实现完整的用户认证流程，包括登录、注册、密码重置等功能',
  status: 'pending',
  runner: 'orchestrator',
  childIds: [],
});

// 设置为当前任务
taskStore.setCurrentTask('main-task');

// 添加子任务
taskStore.addTask({
  id: 'subtask-1',
  title: '设计数据库表结构',
  description: '设计 users 表，包含 id, email, password_hash, created_at 等字段',
  status: 'completed',
  runner: 'architect',
  parentId: 'main-task',
  childIds: [],
});

taskStore.addTask({
  id: 'subtask-2',
  title: '实现登录接口',
  description: 'POST /api/auth/login，验证邮箱密码，返回 JWT token',
  status: 'running',
  runner: 'code-artisan',
  parentId: 'main-task',
  childIds: [],
});

taskStore.addTask({
  id: 'subtask-3',
  title: '实现注册接口',
  description: 'POST /api/auth/register，验证邮箱格式，加密密码存储',
  status: 'pending',
  parentId: 'main-task',
  childIds: [],
});

// 注册工具
taskStore.registerTool({
  id: 'add-subtask',
  name: 'addSubtask',
  params: [
    { name: 'title', type: 'string', required: true },
    { name: 'description', type: 'string', required: true },
    { name: 'runner', type: 'string', required: false },
  ],
  execute: ({ title, description, runner }) => {
    const currentTask = taskStore.getCurrentTask();
    if (!currentTask) return;

    taskStore.addTask({
      id: `task-${Date.now()}`,
      title: title as string,
      description: description as string,
      status: 'pending',
      runner: runner as string | undefined,
      parentId: currentTask.id,
      childIds: [],
    });
  },
});

taskStore.registerTool({
  id: 'update-status',
  name: 'updateStatus',
  params: [
    { name: 'taskId', type: 'string', required: true },
    { name: 'status', type: 'string', required: true },
  ],
  execute: ({ taskId, status }) => {
    taskStore.updateTask(taskId as string, {
      status: status as any,
    });
  },
});

// 生成 markdown 上下文
function generateContext(): string {
  const task = taskStore.getCurrentTask();
  if (!task) return '# 无当前任务';

  const { tasks, tools } = taskStore.state;
  const children = task.childIds.map((id) => tasks.get(id)).filter(Boolean);

  const statusEmoji = {
    pending: '⏳',
    running: '▶️',
    paused: '⏸️',
    completed: '✅',
    failed: '❌',
  };

  let md = `# ${task.title}\n\n`;
  md += `**状态**: ${statusEmoji[task.status]} ${task.status}\n`;
  md += `**执行者**: ${task.runner || '未分配'}\n\n`;
  md += `${task.description}\n\n`;

  if (children.length > 0) {
    md += `## 子任务\n\n`;
    children.forEach((child) => {
      md += `- [${statusEmoji[child.status]}] ${child.title} (${child.runner || '未分配'})\n`;
    });
    md += '\n';
  }

  if (tools.size > 0) {
    md += `## 可用工具\n\n`;
    Array.from(tools.values()).forEach((tool) => {
      const params = tool.params
        .map((p) => `${p.name}: ${p.type}${p.required ? '' : '?'}`)
        .join(', ');
      md += `- ${tool.name}(${params})\n`;
    });
  }

  return md;
}

// 输出上下文
console.log(generateContext());

// 模拟 AI 调用工具
console.log('\n--- AI 调用 addSubtask 工具 ---\n');
const addSubtaskTool = taskStore.state.tools.get('add-subtask');
if (addSubtaskTool) {
  addSubtaskTool.execute({
    title: '编写单元测试',
    description: '为登录和注册接口编写单元测试，覆盖率 > 80%',
    runner: 'guard',
  });
}

// 输出更新后的上下文
console.log(generateContext());

// 模拟更新任务状态
console.log('\n--- AI 调用 updateStatus 工具 ---\n');
const updateStatusTool = taskStore.state.tools.get('update-status');
if (updateStatusTool) {
  updateStatusTool.execute({
    taskId: 'subtask-2',
    status: 'completed',
  });
}

// 输出最终上下文
console.log(generateContext());
