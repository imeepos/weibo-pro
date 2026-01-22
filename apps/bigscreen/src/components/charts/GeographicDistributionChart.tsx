import React, { useMemo } from 'react';
import { EChart, type EChartsOption } from '@sker/ui/components/ui/echart';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { MapPin, Users, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/utils';

export interface GeographicDataItem {
  region: string;
  count: number;      // 用户数
  percentage: number; // 百分比
  posts: number;      // 帖子数
  sentiment: number;  // 情感值 (-1 到 1)
}

interface GeographicDistributionChartProps {
  data: GeographicDataItem[];
  height?: number;
  className?: string;
  showTable?: boolean;
  maxItems?: number;
}

// 根据情感值获取颜色
const getSentimentColor = (sentiment: number): string => {
  if (sentiment >= 0.3) return '#22c55e'; // 正面 - 绿色
  if (sentiment >= 0.1) return '#84cc16'; // 轻微正面 - 浅绿
  if (sentiment >= -0.1) return '#eab308'; // 中性 - 黄色
  if (sentiment >= -0.3) return '#f97316'; // 轻微负面 - 橙色
  return '#ef4444'; // 负面 - 红色
};

// 情感标签
const getSentimentLabel = (sentiment: number): string => {
  if (sentiment >= 0.3) return '正面';
  if (sentiment >= 0.1) return '偏正';
  if (sentiment >= -0.1) return '中性';
  if (sentiment >= -0.3) return '偏负';
  return '负面';
};

const GeographicDistributionChart: React.FC<GeographicDistributionChartProps> = ({
  data,
  height = 400,
  className = '',
  showTable = true,
  maxItems = 15
}) => {
  const { isDark } = useTheme();

  // 处理数据，按用户数排序并限制数量
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems);
  }, [data, maxItems]);

  // 图表配置
  const chartOption: EChartsOption | null = useMemo(() => {
    if (processedData.length === 0) return null;

    const regions = processedData.map(d => d.region);
    const userCounts = processedData.map(d => d.count);
    const postCounts = processedData.map(d => d.posts);
    const sentimentColors = processedData.map(d => getSentimentColor(d.sentiment));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        textStyle: { color: isDark ? '#fff' : '#333' },
        formatter: (params: any) => {
          const dataIndex = params[0]?.dataIndex;
          if (dataIndex === undefined) return '';
          const item = processedData[dataIndex];
          if (!item) return '';
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${item.region}</div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #3b82f6; border-radius: 2px; margin-right: 8px;"></span>
                <span>用户数: <b>${item.count}</b> (${item.percentage.toFixed(1)}%)</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #8b5cf6; border-radius: 2px; margin-right: 8px;"></span>
                <span>帖子数: <b>${item.posts}</b></span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${getSentimentColor(item.sentiment)}; border-radius: 2px; margin-right: 8px;"></span>
                <span>情感: <b>${getSentimentLabel(item.sentiment)}</b> (${item.sentiment.toFixed(2)})</span>
              </div>
            </div>
          `;
        }
      },
      legend: {
        data: ['用户数', '帖子数'],
        top: 0,
        textStyle: { color: isDark ? '#9ca3af' : '#6b7280' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 40,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: { color: isDark ? '#9ca3af' : '#6b7280' },
        splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: regions.reverse(),
        axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
          fontSize: 12,
          formatter: (value: string) => value.length > 6 ? value.slice(0, 6) + '...' : value
        }
      },
      series: [
        {
          name: '用户数',
          type: 'bar',
          data: userCounts.reverse(),
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [0, 4, 4, 0]
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(59, 130, 246, 0.5)' }
          },
          label: {
            show: true,
            position: 'right',
            color: isDark ? '#9ca3af' : '#6b7280',
            fontSize: 10,
            formatter: (params: any) => {
              const idx = processedData.length - 1 - params.dataIndex;
              return `${params.value} (${processedData[idx]?.percentage.toFixed(1)}%)`;
            }
          }
        },
        {
          name: '帖子数',
          type: 'bar',
          data: postCounts.reverse(),
          itemStyle: {
            color: '#8b5cf6',
            borderRadius: [0, 4, 4, 0]
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(139, 92, 246, 0.5)' }
          }
        }
      ]
    };
  }, [processedData, isDark]);

  // 统计摘要
  const summary = useMemo(() => {
    if (processedData.length === 0) return null;
    const totalUsers = processedData.reduce((sum, d) => sum + d.count, 0);
    const totalPosts = processedData.reduce((sum, d) => sum + d.posts, 0);
    const avgSentiment = processedData.reduce((sum, d) => sum + d.sentiment * d.count, 0) / totalUsers;
    const topRegion = processedData[0];
    return { totalUsers, totalPosts, avgSentiment, topRegion, regionCount: processedData.length };
  }, [processedData]);

  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        暂无地理分布数据
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 统计摘要卡片 */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20"
          >
            <div className="flex items-center gap-2 text-blue-400 text-xs mb-1">
              <MapPin className="w-3 h-3" />
              <span>覆盖地区</span>
            </div>
            <div className="text-xl font-bold text-blue-400">{summary.regionCount}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20"
          >
            <div className="flex items-center gap-2 text-purple-400 text-xs mb-1">
              <Users className="w-3 h-3" />
              <span>总用户数</span>
            </div>
            <div className="text-xl font-bold text-purple-400">{summary.totalUsers}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-violet-500/10 rounded-lg p-3 border border-violet-500/20"
          >
            <div className="flex items-center gap-2 text-violet-400 text-xs mb-1">
              <FileText className="w-3 h-3" />
              <span>总帖子数</span>
            </div>
            <div className="text-xl font-bold text-violet-400">{summary.totalPosts}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>平均情感</span>
            </div>
            <div className="text-xl font-bold" style={{ color: getSentimentColor(summary.avgSentiment) }}>
              {getSentimentLabel(summary.avgSentiment)}
            </div>
          </motion.div>
        </div>
      )}

      {/* 主图表 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {chartOption && <EChart option={chartOption} height={height} />}
      </motion.div>

      {/* 详细数据表格 */}
      {showTable && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">排名</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">地区</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">用户数</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">占比</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">帖子数</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">人均帖子</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">情感</th>
              </tr>
            </thead>
            <tbody>
              {processedData.slice(0, 10).map((item, index) => (
                <tr
                  key={item.region}
                  className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2 px-3">
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                      index === 0 && 'bg-yellow-500/20 text-yellow-400',
                      index === 1 && 'bg-gray-400/20 text-gray-400',
                      index === 2 && 'bg-amber-600/20 text-amber-600',
                      index > 2 && 'bg-muted/50 text-muted-foreground'
                    )}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium">{item.region}</td>
                  <td className="py-2 px-3 text-right text-blue-400">{item.count}</td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right text-purple-400">{item.posts}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">
                    {(item.posts / item.count).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${getSentimentColor(item.sentiment)}20`,
                        color: getSentimentColor(item.sentiment)
                      }}
                    >
                      {getSentimentLabel(item.sentiment)}
                      <span className="opacity-70">({item.sentiment.toFixed(2)})</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default GeographicDistributionChart;
