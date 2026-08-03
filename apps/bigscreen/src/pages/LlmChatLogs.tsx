import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Button } from '@sker/ui/components/ui/button';
import {
  BarChart3Icon,
  ServerIcon,
  CpuIcon,
  ActivityIcon,
  TrendingUpIcon,
  AlertCircleIcon,
} from 'lucide-react';
import { EChart } from '@sker/ui/components/ui/echart';
import { useAppStore } from '@/stores/useAppStore';
import { useLlmStats } from '@/hooks/useLlmStats';
import { useLlmLogs } from '@/hooks/useLlmLogs';
import StatsOverview from './LlmChatLogs/StatsOverview';
import LogsTable from './LlmChatLogs/LogsTable';
import FilterBar from './LlmChatLogs/FilterBar';
import { StatsCard } from './LlmChatLogs/StatsCard';
import { getStatusCodeChartOption, getTrendChartOption } from './LlmChatLogs/chartConfigs';

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

  const hasChartData =
    stats &&
    (stats.byModel.length > 0 || stats.byProvider.length > 0 || stats.byStatusCode.length > 0 || stats.byTime.length > 0);

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

      <StatsOverview stats={stats} loading={statsLoading} />

      {hasChartData && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <StatsCard
            title="模型使用统计"
            icon={<CpuIcon className="size-4" />}
            items={stats!.byModel.map((model) => ({
              name: model.modelName,
              count: model.count,
              tokens: model.tokens,
              successRate: model.successRate,
            }))}
          />

          <StatsCard
            title="Provider 使用统计"
            icon={<ServerIcon className="size-4" />}
            items={stats!.byProvider.map((provider) => ({
              name: provider.providerName,
              count: provider.count,
              tokens: provider.tokens,
              successRate: provider.successRate,
            }))}
          />

          {stats!.byStatusCode.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ActivityIcon className="size-4" />
                  状态码分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EChart height={300} option={getStatusCodeChartOption(stats!.byStatusCode)} />
              </CardContent>
            </Card>
          )}

          {stats!.byTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUpIcon className="size-4" />
                  请求趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EChart height={300} option={getTrendChartOption(stats!.byTime, selectedTimeRange)} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="pt-0">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            timeRange={selectedTimeRange}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
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
          <LogsTable
            logs={logs}
            loading={logsLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default LlmChatLogs;
