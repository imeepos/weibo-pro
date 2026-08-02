import React, { useState } from 'react';
import { TaskProvider, useTask, useTaskContext, useTaskActions } from '@sker/aui';

function TaskView() {
  const task = useTask();
  const context = useTaskContext();
  const { updateTask, registerTool: _registerTool } = useTaskActions();
  const [showContext, setShowContext] = useState(false);

  if (!task) return <div>无任务</div>;

  return (
    <div>
      <h2>{task.title}</h2>
      <p>{task.description}</p>
      <p>状态: {task.status}</p>
      <p>执行者: {task.runner || '未分配'}</p>

      <button onClick={() => updateTask(task.id, { status: 'running' })}>
        开始
      </button>
      <button onClick={() => updateTask(task.id, { status: 'completed' })}>
        完成
      </button>

      <button onClick={() => setShowContext(!showContext)}>
        {showContext ? '隐藏' : '显示'}上下文
      </button>

      {showContext && <pre>{context}</pre>}
    </div>
  );
}

export default function App() {
  const { addTask, setCurrentTask, registerTool } = useTaskActions();

  React.useEffect(() => {
    const mainTask = {
      id: 'task-1',
      title: '实现用户认证',
      description: '需要实现登录、注册、密码重置功能',
      status: 'pending' as const,
      runner: 'orchestrator',
      childIds: [],
    };

    addTask(mainTask);
    setCurrentTask('task-1');

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
          parentId: 'task-1',
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
