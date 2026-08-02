import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Input } from '@sker/ui/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sker/ui/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import {
  BarChart3Icon,
  ServerIcon,
  CpuIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ActivityIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { EChart } from '@sker/ui/components/ui/echart';
import { useAppStore } from '@/stores/useAppStore';
import { useLlmStats } from '@/hooks/useLlmStats';
import { useLlmLogs } from '@/hooks/useLlmLogs';
import { StatsCard } from './LlmChatLogs/StatsCard';
import { getStatusCodeChartOption, getTrendChartOption } from './LlmChatLogs/chartConfigs';
import { formatTokens, formatDate, calculateSuccessRate } from './LlmChatLogs/utils';
import { TIME_RANGE_LABELS, SUCCESS_THRESHOLD, HTTP_OK } from './LlmChatLogs/constants';

const LlmChatLogs: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useLlmStats(selectedTimeRange);
  const {
    logs,
    loading: logsLoading,
    error: logsError,
    currentPage,
    totalPages,
    setCurrentPage,
    setFilters,
    filters,
    refetch: refetchLogs,
  } = useLlmLogs(selectedTimeRange);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchLogs()]);
    } finally {
      setRefreshing(false);
    }
  };

  const hasError = statsError || logsError;

  return (
    <div className="h-full overflow-auto p-4">
      {hasError && (
        <Card className="border-destructive mb-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircleIcon className="size-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">数据加载失败</p>
                <p className="text-sm text-muted-foreground">
                  {statsError?.message || logsError?.message || '未知错误'}
                </p>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">总请求数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                  <CheckCircleIcon className="size-5 text-green-500" />
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-green-600">成功 {stats.successCount}</span>
                  <span className="text-xs text-red-600">失败 {stats.failCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Token 使用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>输入 {formatTokens(stats.totalPromptTokens)}</span>
                  <span>输出 {formatTokens(stats.totalCompletionTokens)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">平均耗时</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{stats.avgDurationMs}ms</div>
                  <ClockIcon className="size-5 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">成功率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{calculateSuccessRate(stats.successCount, stats.totalRequests)}%</div>
                  <Badge
                    variant={
                      calculateSuccessRate(stats.successCount, stats.totalRequests) > SUCCESS_THRESHOLD
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {calculateSuccessRate(stats.successCount, stats.totalRequests) > SUCCESS_THRESHOLD ? '优秀' : '需改进'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {stats && (stats.byModel.length > 0 || stats.byProvider.length > 0 || stats.byStatusCode.length > 0 || stats.byTime.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <StatsCard
            title="模型使用统计"
            icon={<CpuIcon className="size-4" />}
            items={stats.byModel.map((model) => ({
              name: model.modelName,
              count: model.count,
              tokens: model.tokens,
              successRate: model.successRate,
            }))}
          />

          <StatsCard
            title="Provider 使用统计"
            icon={<ServerIcon className="size-4" />}
            items={stats.byProvider.map((provider) => ({
              name: provider.providerName,
              count: provider.count,
              tokens: provider.tokens,
              successRate: provider.successRate,
            }))}
          />

          {stats.byStatusCode.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ActivityIcon className="size-4" />
                  状态码分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EChart height={300} option={getStatusCodeChartOption(stats.byStatusCode)} />
              </CardContent>
            </Card>
          )}

          {stats.byTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUpIcon className="size-4" />
                  请求趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EChart height={300} option={getTrendChartOption(stats.byTime, selectedTimeRange)} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg">
              时间范围: <span className="font-medium text-foreground">{TIME_RANGE_LABELS[selectedTimeRange]}</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <Input
              type="text"
              value={filters.modelName}
              onChange={(e) => setFilters({ ...filters, modelName: e.target.value })}
              placeholder="模型名称"
              className="w-[150px]"
            />
            <Input
              type="text"
              value={filters.providerId}
              onChange={(e) => setFilters({ ...filters, providerId: e.target.value })}
              placeholder="Provider ID"
              className="w-[150px]"
            />
            <Select
              value={filters.isSuccess === undefined ? 'all' : filters.isSuccess.toString()}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  isSuccess: value === 'all' ? undefined : value === 'true',
                })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="true">成功</SelectItem>
                <SelectItem value="false">失败</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-6 bg-border" />
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
              <RefreshCwIcon className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3Icon className="size-4" />
            请求日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3Icon className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">暂无日志数据</p>
              <p className="text-sm text-muted-foreground mt-1">尝试调整筛选条件或时间范围</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>状态码</TableHead>
                    <TableHead>错误</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                      <TableCell>{log.providerName || log.providerId}</TableCell>
                      <TableCell className="font-medium">{log.modelName}</TableCell>
                      <TableCell>
                        {log.isSuccess ? (
                          <CheckCircleIcon className="size-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="size-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>{log.durationMs}ms</TableCell>
                      <TableCell>{formatTokens(log.totalTokens || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={log.statusCode === HTTP_OK ? 'default' : 'destructive'}>{log.statusCode}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-xs" title={log.error}>
                        {log.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
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
