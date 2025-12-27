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
