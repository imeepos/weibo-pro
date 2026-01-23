import React from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import type { PropagationVelocityAnalysis } from '@sker/sdk';

interface PropagationVelocityChartProps {
  title?: string;
  className?: string;
  data?: PropagationVelocityAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
  height?: number;
}

// 传播阶段中文映射
const PHASE_MAP: Record<string, string> = {
  initial: '初始期',
  growth: '增长期',
  peak: '爆发期',
  decline: '衰退期',
  stable: '稳定期',
};

// 加速度趋势中文映射
const ACCELERATION_TREND_MAP: Record<string, string> = {
  increasing: '增长中',
  stable: '稳定',
  decreasing: '下降中',
};

const PropagationVelocityChart: React.FC<PropagationVelocityChartProps> = ({
  title = '传播速度分析',
  className,
  data,
  isLoading = false,
  error = null,
  height = 400,
}) => {
  if (isLoading) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
        <ChartState loading loadingText="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
        <ChartState error={error.message} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
        <ChartState empty emptyText="暂无传播速度数据" />
      </div>
    );
  }

  const phaseText = PHASE_MAP[data.currentPhase] || data.currentPhase;
  const accelerationTrendText = ACCELERATION_TREND_MAP[data.accelerationTrend] || data.accelerationTrend;

  return (
    <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      <div className="space-y-6">
        {/* 基础指标 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">当前速度</div>
            <div className="text-2xl font-bold text-white">
              {data.currentVelocity != null ? data.currentVelocity.toLocaleString() : '-'}
            </div>
            <div className="text-xs text-gray-500">转发/小时</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">峰值速度</div>
            <div className="text-2xl font-bold text-white">
              {data.peakVelocity != null ? data.peakVelocity.toLocaleString() : '-'}
            </div>
            <div className="text-xs text-gray-500">转发/小时</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">平均速度</div>
            <div className="text-2xl font-bold text-white">
              {data.avgVelocity != null ? data.avgVelocity.toLocaleString() : '-'}
            </div>
            <div className="text-xs text-gray-500">转发/小时</div>
          </div>
        </div>

        {/* 加速度分析 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">加速度</span>
            <span className="text-lg font-bold text-blue-400">
              {data.acceleration} {accelerationTrendText}
            </span>
          </div>
        </div>

        {/* 传播阶段 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">传播阶段</div>
          <div className="text-xl font-semibold text-green-400">
            {phaseText}
          </div>
        </div>

        {/* 爆发点预测 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">爆发点预测</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">爆发概率</span>
            <span className="text-blue-400 font-bold">{(data.burstProbability * 100).toFixed(1)}%</span>
          </div>
          {data.predictedBurstTime && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-300">预测爆发时间</span>
              <span className="text-gray-400">{new Date(data.predictedBurstTime).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* 图表占位符 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">速度曲线</div>
          <div
            className="rounded bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground"
            style={{ height: `${height - 100}px` }}
          >
            ECharts 速度曲线图表
          </div>
        </div>
      </div>
    </div>
  );
};

export { PropagationVelocityChart };
export default PropagationVelocityChart;
