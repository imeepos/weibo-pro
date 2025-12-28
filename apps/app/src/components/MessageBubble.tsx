/**
 * MessageBubble - 消息气泡组件
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for environments where clipboard API is not available
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          'relative max-w-[80%] px-4 py-2.5 rounded-2xl',
          isUser ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap break-words pr-8">{message.content}</p>
        {message.isStreaming && <span className="text-muted-foreground text-base animate-pulse">...</span>}
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-2 right-2 p-1 rounded transition-colors',
            copied ? 'bg-green-500/20' : 'hover:bg-black/10 active:bg-black/20'
          )}
          aria-label="复制消息"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 opacity-50" />
          )}
        </button>
      </div>
      <span className="text-xs text-muted-foreground mt-1 mx-1">
        {new Date(message.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

function SystemMessageContent({ message }: { message: ChatMessage }) {
  const { messageType, metadata, content } = message;

  switch (messageType) {
    case 'system-init':
      return <span className="text-xs text-muted-foreground">系统已就绪</span>;

    case 'tool-use':
      return (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{metadata?.toolName}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                metadata?.status === 'success'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : metadata?.status === 'error'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              )}
            >
              {metadata?.status || '执行中'}
            </span>
          </div>
          {metadata?.command && (
            <div className="text-muted-foreground font-mono text-[11px] max-w-[200px] truncate bg-muted/30 px-2 py-1 rounded">
              {metadata.command}
            </div>
          )}
          {content && !metadata?.command && (
            <div className="text-muted-foreground font-mono text-[11px] max-w-[200px] truncate">{content}</div>
          )}
          {metadata?.duration && (
            <div className="text-muted-foreground">
              耗时: <span className="font-medium">{(metadata.duration / 1000).toFixed(2)}s</span>
            </div>
          )}
          {metadata?.startTime && (
            <div className="text-muted-foreground text-[10px]">
              {new Date(metadata.startTime).toLocaleTimeString()}
            </div>
          )}
        </div>
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
