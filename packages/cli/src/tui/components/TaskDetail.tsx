/**
 * TaskDetail - 任务详情组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { TaskState } from '../types/claude-types.js';

interface TaskDetailProps {
  task?: TaskState;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ task }) => {
  if (!task) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>请选择一个任务</Text>
      </Box>
    );
  }

  const recentMessages = task.messages.slice(-10);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold>
          {task.status === 'running' && (
            <>
              <Text color="blue">
                <Spinner type="dots" />
              </Text>
              {' '}
            </>
          )}
          {task.name}
        </Text>
      </Box>

      {recentMessages.length > 0 && (
        <Box flexDirection="column" gap={0}>
          {recentMessages.map((msg, i) => (
            <Text key={i} dimColor>
              {'> '}{msg}
            </Text>
          ))}
        </Box>
      )}

      {task.status === 'complete' && (
        <Box marginTop={1}>
          <Text color="green">✓ 任务已完成</Text>
        </Box>
      )}

      {task.status === 'error' && (
        <Box marginTop={1}>
          <Text color="red">✗ 任务失败</Text>
        </Box>
      )}
    </Box>
  );
};
