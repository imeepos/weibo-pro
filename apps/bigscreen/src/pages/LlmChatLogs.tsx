import React, { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { LlmChatLogsController, type LlmChatLogStats, type LlmChatLogItem } from '@sker/sdk';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { BarChart3Icon, ServerIcon, CpuIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

const LlmChatLogs: React.FC = () => {
  const [stats, setStats] = useState<LlmChatLogStats | null>(null);
  const [logs, setLogs] = useState<LlmChatLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    modelName: '',
    providerId: '',
    isSuccess: undefined as boolean | undefined,
  });

  const controller = root.get(LlmChatLogsController);

  useEffect(() => {
    loadStats();
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    loadLogs();
  }, [filters, currentPage]);

  const loadStats = async () => {
    try {
      const statsData = await controller.getStats(filters.startDate, filters.endDate);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await controller.list(
        filters.startDate,
        filters.endDate,
        filters.modelName,
        filters.providerId,
        filters.isSuccess,
        currentPage,
        pageSize
      );
      setLogs(result.items);
      setTotalPages(Math.ceil(result.total / pageSize));
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(2)}K`;
    return tokens.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-full overflow-auto p-4">
      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总请求数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
              <div className="flex gap-4 mt-2">
                <span className="text-xs text-green-600">成功: {stats.successCount}</span>
                <span className="text-xs text-red-600">失败: {stats.failCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Token 使用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</div>
              <div className="flex gap-4 mt-2">
                <span className="text-xs text-muted-foreground">
                  输入: {formatTokens(stats.totalPromptTokens)}
                </span>
                <span className="text-xs text-muted-foreground">
                  输出: {formatTokens(stats.totalCompletionTokens)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">平均耗时</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDurationMs}ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalRequests > 0
                  ? Math.round((stats.successCount / stats.totalRequests) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选条件 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="开始日期"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="结束日期"
            />
            <input
              type="text"
              value={filters.modelName}
              onChange={(e) => setFilters({ ...filters, modelName: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="模型名称"
            />
            <input
              type="text"
              value={filters.providerId}
              onChange={(e) => setFilters({ ...filters, providerId: e.target.value })}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Provider ID"
            />
            <select
              value={filters.isSuccess === undefined ? '' : filters.isSuccess.toString()}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  isSuccess: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">全部状态</option>
              <option value="true">成功</option>
              <option value="false">失败</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 模型统计 */}
      {stats && stats.byModel.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CpuIcon className="size-4" />
              模型使用统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byModel.map((model) => (
                <div key={model.modelName} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{model.modelName}</span>
                    <Badge variant={model.successRate > 90 ? 'default' : 'destructive'}>
                      {model.successRate}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>请求: {model.count}</span>
                    <span>Token: {formatTokens(model.tokens)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider 统计 */}
      {stats && stats.byProvider.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ServerIcon className="size-4" />
              Provider 使用统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byProvider.map((provider) => (
                <div key={provider.providerId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{provider.providerName}</span>
                    <Badge variant={provider.successRate > 90 ? 'default' : 'destructive'}>
                      {provider.successRate}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>请求: {provider.count}</span>
                    <span>Token: {formatTokens(provider.tokens)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3Icon className="size-4" />
            请求日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">时间</th>
                      <th className="text-left p-2">Provider</th>
                      <th className="text-left p-2">模型</th>
                      <th className="text-left p-2">状态</th>
                      <th className="text-left p-2">耗时</th>
                      <th className="text-left p-2">Tokens</th>
                      <th className="text-left p-2">状态码</th>
                      <th className="text-left p-2">错误</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 text-muted-foreground">{formatDate(log.createdAt)}</td>
                        <td className="p-2">{log.providerName || log.providerId}</td>
                        <td className="p-2 font-medium">{log.modelName}</td>
                        <td className="p-2">
                          {log.isSuccess ? (
                            <CheckCircleIcon className="size-4 text-green-500" />
                          ) : (
                            <XCircleIcon className="size-4 text-red-500" />
                          )}
                        </td>
                        <td className="p-2">{log.durationMs}ms</td>
                        <td className="p-2">{formatTokens(log.totalTokens || 0)}</td>
                        <td className="p-2">
                          <Badge variant={log.statusCode === 200 ? 'default' : 'destructive'}>
                            {log.statusCode}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground truncate max-w-xs" title={log.error}>
                          {log.error || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LlmChatLogs;