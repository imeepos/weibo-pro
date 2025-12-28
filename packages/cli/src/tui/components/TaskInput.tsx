/**
 * TaskInput - 任务输入组件
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface TaskInputProps {
  onSubmit: (command: string) => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onSubmit }) => {
  const [input, setInput] = useState('');
  const [isActive, setIsActive] = useState(false);

  useInput((char, key) => {
    if (!isActive) {
      if (char === 'n') {
        setIsActive(true);
      }
      return;
    }

    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
        setInput('');
      }
      setIsActive(false);
    } else if (key.escape) {
      setInput('');
      setIsActive(false);
    } else if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
    } else if (char && !key.ctrl && !key.meta) {
      setInput(prev => prev + char);
    }
  });

  if (!isActive) {
    return null;
  }

  return (
    <Box borderStyle="single" borderColor="yellow" paddingX={1}>
      <Text color="yellow">新任务: </Text>
      <Text>{input}</Text>
      <Text dimColor> [Enter 提交 | Esc 取消]</Text>
    </Box>
  );
};
