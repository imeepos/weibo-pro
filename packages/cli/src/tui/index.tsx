/**
 * TUI - 终端用户界面主组件
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { TaskList } from './components/TaskList.js';
import { TaskDetail } from './components/TaskDetail.js';
import { TaskInput } from './components/TaskInput.js';
import { TaskManager } from '../task-manager.js';

interface TuiProps {
  taskManager: TaskManager;
  onAddTask: (command: string) => void;
}

export const Tui: React.FC<TuiProps> = ({ taskManager, onAddTask }) => {
  const { exit } = useApp();
  const [tasks, setTasks] = useState(taskManager.getTasks());
  const [currentTaskId, setCurrentTaskId] = useState(taskManager.getCurrentTask()?.id);

  useEffect(() => {
    const updateTasks = () => {
      setTasks(taskManager.getTasks());
      setCurrentTaskId(taskManager.getCurrentTask()?.id);
    };

    taskManager.on('task-added', updateTasks);
    taskManager.on('task-updated', updateTasks);
    taskManager.on('task-removed', updateTasks);
    taskManager.on('task-switched', updateTasks);
    taskManager.on('task-message', updateTasks);
    taskManager.on('task-progress', updateTasks);

    return () => {
      taskManager.removeAllListeners();
    };
  }, [taskManager]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.upArrow) {
      const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
      if (currentIndex > 0) {
        taskManager.switchTask(tasks[currentIndex - 1].id);
      }
    }

    if (key.downArrow) {
      const currentIndex = tasks.findIndex(t => t.id === currentTaskId);
      if (currentIndex < tasks.length - 1) {
        taskManager.switchTask(tasks[currentIndex + 1].id);
      }
    }

    if (input === 'c' && key.ctrl === false) {
      taskManager.clearCompleted();
    }

    if (input === 'q') {
      exit();
    }
  });

  const currentTask = tasks.find(t => t.id === currentTaskId);
  const stats = taskManager.getStats();

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" flexDirection="column">
        <Box paddingX={1} paddingY={0}>
          <Text bold color="cyan">SKER CLI - 任务管理器</Text>
          <Box flexGrow={1} />
          <Text dimColor>[Ctrl+C 退出]</Text>
        </Box>
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" flexDirection="column">
        <Box paddingX={1} paddingY={0} borderBottom borderColor="gray">
          <Text bold>任务列表</Text>
          <Box flexGrow={1} />
          <Text dimColor>
            运行: {stats.running} | 完成: {stats.complete} | 总计: {stats.total}
          </Text>
        </Box>
        <TaskList tasks={tasks} currentTaskId={currentTaskId} />
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" flexDirection="column" flexGrow={1}>
        <Box paddingX={1} paddingY={0} borderBottom borderColor="gray">
          <Text bold>当前任务</Text>
        </Box>
        <TaskDetail task={currentTask} />
      </Box>

      <TaskInput onSubmit={onAddTask} />

      <Box marginTop={1} paddingX={1}>
        <Text dimColor>[↑↓] 切换任务  [n] 新任务  [c] 清空已完成  [q] 退出</Text>
      </Box>
    </Box>
  );
};

