import React, { useMemo } from 'react';
import { EChart } from '@sker/ui/components/ui/echart';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { MapPin, Users, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/utils';
import {
  type GeographicDataItem,
  getSentimentColor,
  getSentimentLabel,
  sortAndLimitData,
  buildGeographicSummary,
  buildGeographicChartOption,
} from './GeographicDistributionChart.utils';

export type { GeographicDataItem } from './GeographicDistributionChart.utils';

interface GeographicDistributionChartProps {
  data: GeographicDataItem[];
  totalPosts?: number;    // 真实总帖子数，与顶部统计保持一致
  totalUsers?: number;    // 真实总用户数
  totalRegions?: number;  // 真实总地区数
  height?: number;
  className?: string;
  showTable?: boolean;
  maxItems?: number;
}

const GeographicDistributionChart: React.FC<GeographicDistributionChartProps> = ({
  data,
  totalPosts: propTotalPosts,
  totalUsers: propTotalUsers,
  totalRegions: propTotalRegions,
  height = 400,
  className = '',
  showTable = true,
  maxItems = 15
}) => {
  const { isDark } = useTheme();

  // 处理数据，按用户数排序并限制数量
  const processedData = useMemo(() => sortAndLimitData(data, maxItems), [data, maxItems]);

  // 图表配置
  const chartOption = useMemo(
    () => buildGeographicChartOption(processedData, isDark),
    [processedData, isDark]
  );

  // 统计摘要
  const summary = useMemo(
    () => buildGeographicSummary(processedData, propTotalPosts, propTotalUsers, propTotalRegions),
    [processedData, propTotalPosts, propTotalUsers, propTotalRegions]
  );

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
              <span>发帖用户数</span>
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
            <div className="text-[10px] text-muted-foreground mt-0.5">
              与顶部统计一致
            </div>
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
