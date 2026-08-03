import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Skeleton } from '@sker/ui/components/ui/skeleton';
import { Badge } from '@sker/ui/components/ui/badge';
import { CheckCircleIcon, ClockIcon } from 'lucide-react';
import type { LlmChatLogStats } from '@sker/sdk';
import { formatTokens, calculateSuccessRate } from './utils';
import { SUCCESS_THRESHOLD } from './constants';

interface StatsOverviewProps {
  stats: LlmChatLogStats | null;
  loading: boolean;
}

const StatsLoading: React.FC = () => (
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
);

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, loading }) => {
  if (loading) {
    return <StatsLoading />;
  }

  if (!stats) {
    return null;
  }

  const successRate = calculateSuccessRate(stats.successCount, stats.totalRequests);

  return (
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
            <div className="text-2xl font-bold">{successRate}%</div>
            <Badge
              variant={
                successRate > SUCCESS_THRESHOLD
                  ? 'default'
                  : 'destructive'
              }
            >
              {successRate > SUCCESS_THRESHOLD ? '优秀' : '需改进'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsOverview;
