/**
 * CliListPage - CLI 客户端列表页面
 */

import { useEffect, useState } from 'react';
import { RefreshCw, Circle, Activity } from 'lucide-react';
import { Button, ScrollArea } from '@/components/ui';
import { root } from '@sker/core';
import { ClaudeController } from '@sker/sdk';

interface CliClient {
  clientId: string;
  socketId: string;
  connectedAt: number;
  activeTaskCount: number;
}

export function CliListPage() {
  const [clients, setClients] = useState<CliClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);

    try {
      const claudeController = root.get(ClaudeController);
      const result = await claudeController.getOnlineClients();

      if (result.success) {
        setClients(result.data);
      } else {
        setError('获取客户端列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取客户端列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    // 每 5 秒自动刷新
    const interval = setInterval(fetchClients, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (timestamp: number) => {
    const duration = Date.now() - timestamp;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 顶部标题栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">在线 CLI 客户端</h1>
          <span className="text-sm text-muted-foreground">
            {clients.length} 个在线
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchClients}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 shrink-0">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 客户端列表 */}
      <ScrollArea className="flex-1">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">暂无在线客户端</h2>
            <p className="text-base text-muted-foreground text-center">
              当有 CLI 客户端连接时，它们会显示在这里
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {clients.map((client) => (
              <div
                key={client.clientId}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* 客户端头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    <span className="font-mono text-sm font-medium text-foreground">
                      {client.clientId.substring(0, 8)}...
                    </span>
                  </div>
                  {client.activeTaskCount > 0 && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {client.activeTaskCount} 个任务
                    </span>
                  )}
                </div>

                {/* 客户端详情 */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>客户端 ID:</span>
                    <span className="font-mono text-xs">{client.clientId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Socket ID:</span>
                    <span className="font-mono text-xs">{client.socketId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>连接时间:</span>
                    <span>{formatTime(client.connectedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>在线时长:</span>
                    <span>{formatDuration(client.connectedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
