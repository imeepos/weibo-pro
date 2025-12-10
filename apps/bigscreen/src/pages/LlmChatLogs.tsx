import React, { useState, useEffect } from 'react';
import { root } from '@sker/core';
import { LlmChatLogsController, type LlmChatLogStats, type LlmChatLogItem } from '@sker/sdk';
import { Card, CardHeader, CardTitle, CardContent } from '@sker/ui/components/ui/card';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { Button } from '@sker/ui/components/ui/button';
import { Badge } from '@sker/ui/components/ui/badge';
import { Input } from '@sker/ui/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@sker/ui/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sker/ui/components/ui/select';
import { BarChart3Icon, ServerIcon, CpuIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ActivityIcon, TrendingUpIcon } from 'lucide-react';
import { EChart } from '@sker/ui/components/ui/echart';
import { TimeSeriesChart } from '@sker/ui/components/ui/time-series-chart';
import { useAppStore } from '@/stores/useAppStore';
import { getDateRangeByTimeRange, type TimeRange } from '@sker/entities';

const LlmChatLogs: React.FC = () => {
  const { selectedTimeRange } = useAppStore();
  const [stats, setStats] = useState<LlmChatLogStats | null>(null);
  const [logs, setLogs] = useState<LlmChatLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    modelName: '',
    providerId: '',
    isSuccess: undefined as boolean | undefined,
  });

  const controller = root.get(LlmChatLogsController);

  // 时间范围显示文本映射
  const timeRangeLabels: Record<TimeRange, string> = {
    '1h': '近1小时',
    '6h': '近6小时',
    '12h': '近12小时',
    '24h': '近24小时',
    '7d': '近7天',
    '30d': '近30天',
    '90d': '近90天',
    '180d': '近180天',
    '365d': '近365天',
  };

  // 根据选择的时间范围计算日期范围
  const getDateRange = () => {
    const { start, end } = getDateRangeByTimeRange(selectedTimeRange);
    return {
      startDate: start.toISOString(), // Full ISO format with time
      endDate: end.toISOString(),
    };
  };

  useEffect(() => {
    loadStats();
  }, [selectedTimeRange]);

  useEffect(() => {
    loadLogs();
  }, [selectedTimeRange, filters, currentPage]);

  const loadStats = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const statsData = await controller.getStats(startDate, endDate);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const result = await controller.list(
        startDate,
        endDate,
        filters.modelName,
        filters.providerId,
        filters.isSuccess === undefined ? undefined : filters.isSuccess ? `1` : `0`,
        `${currentPage}`,
        `${pageSize}`
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
                <div className="text-2xl font-bold">
                  {stats.totalRequests > 0
                    ? Math.round((stats.successCount / stats.totalRequests) * 100)
                    : 0}%
                </div>
                <Badge variant={stats.totalRequests > 0 && (stats.successCount / stats.totalRequests) * 100 > 90 ? 'default' : 'destructive'}>
                  {stats.totalRequests > 0 && (stats.successCount / stats.totalRequests) * 100 > 90 ? '优秀' : '需改进'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* 模型和 Provider 统计 */}
      {(stats?.byModel.length || stats?.byProvider.length) && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* 模型统计 */}
          {stats.byModel.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CpuIcon className="size-4" />
                  模型使用统计
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {stats.byModel.map((model) => (
                    <div key={model.modelName} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{model.modelName}</span>
                        <Badge variant={model.successRate > 90 ? 'default' : 'destructive'} className="text-xs">
                          {model.successRate}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>请求 {model.count}</span>
                        <span>Token {formatTokens(model.tokens)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider 统计 */}
          {stats.byProvider.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ServerIcon className="size-4" />
                  Provider 使用统计
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {stats.byProvider.map((provider) => (
                    <div key={provider.providerId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{provider.providerName}</span>
                        <Badge variant={provider.successRate > 90 ? 'default' : 'destructive'} className="text-xs">
                          {provider.successRate}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>请求 {provider.count}</span>
                        <span>Token {formatTokens(provider.tokens)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 状态码统计图 */}
          {stats.byStatusCode.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ActivityIcon className="size-4" />
                  状态码分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EChart
                  height={300}
                  option={{
                    tooltip: {
                      trigger: 'item',
                      formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    legend: {
                      orient: 'vertical',
                      right: 'right',
                      top: 'center'
                    },
                    series: [{
                      name: '状态码',
                      type: 'pie',
                      radius: ['50%', '70%'],
                      center: ['40%', '50%'],
                      avoidLabelOverlap: false,
                      label: {
                        show: true,
                        position: 'center',
                        formatter: () => '状态码',
                        fontSize: 16
                      },
                      emphasis: {
                        label: {
                          show: true,
                          fontSize: 18,
                          fontWeight: 'bold'
                        }
                      },
                      labelLine: {
                        show: false
                      },
                      data: stats.byStatusCode.map(item => ({
                        value: item.count,
                        name: `${item.statusCode}`,
                        itemStyle: {
                          color: item.statusCode === 200 ? '#10b981' :
                            item.statusCode >= 400 && item.statusCode < 500 ? '#f59e0b' : '#ef4444'
                        }
                      }))
                    }]
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* 时间统计图 */}
          {stats.byTime.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUpIcon className="size-4" />
                  请求趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EChart
                  height={300}
                  option={{
                    tooltip: {
                      trigger: 'axis',
                      axisPointer: {
                        type: 'cross'
                      }
                    },
                    grid: {
                      left: '3%',
                      right: '4%',
                      bottom: '3%',
                      top: '10%',
                      containLabel: true
                    },
                    xAxis: {
                      type: 'category',
                      boundaryGap: false,
                      data: stats.byTime.map(item => {
                        const date = new Date(item.date);
                        // 根据时间范围格式化标签
                        if (selectedTimeRange === '1h') {
                          // 分钟级别：显示 HH:mm
                          return date.toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });
                        } else if (selectedTimeRange === '6h' || selectedTimeRange === '12h' || selectedTimeRange === '24h') {
                          // 小时级别：显示 MM-DD HH:mm
                          return date.toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });
                        } else {
                          // 天级别：显示 MM-DD
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }
                      })
                    },
                    yAxis: [
                      {
                        type: 'value',
                        name: '请求数',
                        position: 'left',
                        axisLine: {
                          show: true,
                          lineStyle: {
                            color: '#5470c6'
                          }
                        }
                      },
                      {
                        type: 'value',
                        name: 'Token数',
                        position: 'right',
                        axisLine: {
                          show: true,
                          lineStyle: {
                            color: '#91cc75'
                          }
                        }
                      }
                    ],
                    series: [
                      {
                        name: '请求数',
                        type: 'line',
                        yAxisIndex: 0,
                        smooth: true,
                        data: stats.byTime.map(item => item.count),
                        itemStyle: {
                          color: '#5470c6'
                        },
                        areaStyle: {
                          color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                              { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                              { offset: 1, color: 'rgba(84, 112, 198, 0.05)' }
                            ]
                          }
                        }
                      },
                      {
                        name: 'Token数',
                        type: 'bar',
                        yAxisIndex: 1,
                        data: stats.byTime.map(item => item.tokens),
                        itemStyle: {
                          color: '#91cc75'
                        }
                      }
                    ]
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {/* 筛选条件 */}
      <Card className="mb-4">
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* 时间范围提示 */}
            <div className="text-sm text-muted-foreground bg-muted/20 px-3 py-2 rounded-lg">
              时间范围: <span className="font-medium text-foreground">
                {timeRangeLabels[selectedTimeRange] || selectedTimeRange}
              </span>
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
          </div>
        </CardContent>
      </Card>

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
                        <Badge variant={log.statusCode === 200 ? 'default' : 'destructive'}>
                          {log.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-xs" title={log.error}>
                        {log.error || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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