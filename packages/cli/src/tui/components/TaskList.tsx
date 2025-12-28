/**
 * TaskList - 任务列表组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { TaskState } from '../types/claude-types.js';

interface TaskListProps {
  tasks: TaskState[];
  currentTaskId?: string;
}

const STATUS_ICONS = {
  pending: '○',
  running: '●',
  complete: '✓',
  error: '✗',
  aborted: '⊗',
} as const;

const STATUS_COLORS = {
  pending: 'gray',
  running: 'blue',
  complete: 'green',
  error: 'red',
  aborted: 'yellow',
} as const;

export const TaskList: React.FC<TaskListProps> = ({ tasks, currentTaskId }) => {
  if (tasks.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>暂无任务</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {tasks.map((task, index) => {
        const isCurrent = task.id === currentTaskId;
        const icon = STATUS_ICONS[task.status];
        const color = STATUS_COLORS[task.status];
        const progressBar = '█'.repeat(Math.floor(task.progress / 10)) + '░'.repeat(10 - Math.floor(task.progress / 10));

        return (
          <Box key={task.id} flexDirection="row" gap={1}>
            <Text color={isCurrent ? 'cyan' : 'white'}>
              [{index + 1}]
            </Text>
            <Text color={color}>{icon}</Text>
            <Box width={25}>
              <Text color={isCurrent ? 'cyan' : 'white'} bold={isCurrent}>
                {task.name.slice(0, 25)}
              </Text>
            </Box>
            <Box width={10}>
              <Text dimColor>{task.status}</Text>
            </Box>
            <Text dimColor>{progressBar}</Text>
            <Text dimColor>{task.progress}%</Text>
          </Box>
        );
      })}
    </Box>
  );
};
