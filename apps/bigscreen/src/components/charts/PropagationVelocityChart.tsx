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
        <ChartState.Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
        <ChartState.Error message={error.message} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
        <ChartState.Empty message="暂无传播速度数据" />
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
              {data.currentVelocity.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">转发/小时</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">峰值速度</div>
            <div className="text-2xl font-bold text-white">
              {data.peakVelocity.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">转发/小时</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">平均速度</div>
            <div className="text-2xl font-bold text-white">
              {data.avgVelocity.toLocaleString()}
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

        {/* 爆发点 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-3">爆发点</div>
          {data.burstPoints.length > 0 ? (
            <div className="space-y-2">
              {data.burstPoints.map((burst, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm bg-gray-700/30 rounded px-3 py-2"
                >
                  <span className="text-gray-300">{burst.reason}</span>
                  <span className="text-gray-400">{burst.velocity} 转发/小时</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-xs">
              暂无爆发点
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
