/**
 * MessageBubble - 消息气泡组件
 */

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // 系统消息样式
  if (isSystem) {
    return (
      <div className="my-2 mx-3 flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
          <SystemMessageContent message={message} />
        </div>
      </div>
    );
  }

  // 用户/助手消息样式
  return (
    <div className={cn('my-1 mx-3', isUser ? 'flex flex-col items-end' : 'flex flex-col items-start')}>
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 rounded-2xl',
          isUser ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        {message.isStreaming && <span className="text-muted-foreground text-base animate-pulse">...</span>}
      </div>
      <span className="text-xs text-muted-foreground mt-1 mx-1">
        {new Date(message.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

function SystemMessageContent({ message }: { message: ChatMessage }) {
  const { messageType, metadata } = message;

  switch (messageType) {
    case 'system-init':
      return <span className="text-xs text-muted-foreground">系统已就绪</span>;

    case 'tool-use':
      return (
        <span className="text-xs text-muted-foreground">
          工具: <span className="font-medium">{metadata?.toolName}</span>
        </span>
      );

    case 'result':
      return (
        <span className="text-xs text-muted-foreground">
          执行完成 {metadata?.duration && `(${(metadata.duration / 1000).toFixed(2)}s)`}
        </span>
      );

    case 'complete':
      return <span className="text-xs text-green-600 dark:text-green-400">任务完成</span>;

    default:
      return <span className="text-xs text-muted-foreground">{message.content}</span>;
  }
}
