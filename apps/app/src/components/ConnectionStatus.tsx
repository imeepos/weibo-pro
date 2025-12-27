/**
 * ConnectionStatus - 连接状态指示器组件
 */

import { cn } from '@/lib/utils';
import type { ConnectionStatus as ConnectionStatusType } from '@/types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  clientId?: string | null;
}

const STATUS_CONFIG = {
  disconnected: {
    color: 'bg-muted-foreground',
    text: '未连接',
  },
  connecting: {
    color: 'bg-yellow-500',
    text: '连接中...',
  },
  connected: {
    color: 'bg-green-500',
    text: '已连接',
  },
  error: {
    color: 'bg-destructive',
    text: '连接错误',
  },
};

export function ConnectionStatus({ status, clientId }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full">
      <div className={cn('w-2 h-2 rounded-full', config.color)} />
      <span className="text-xs text-muted-foreground">{config.text}</span>
      {clientId && status === 'connected' && (
        <span className="text-[10px] text-muted-foreground/70 ml-2">ID: {clientId.substring(0, 8)}...</span>
      )}
    </div>
  );
}
