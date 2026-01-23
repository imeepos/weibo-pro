import React, { useMemo } from 'react';
import { cn } from '@/utils';
import { ChartState } from '@sker/ui/components/ui/chart-state';
import type { InfluencePredictionAnalysis } from '@sker/sdk';

interface InfluencePredictionCardProps {
  title?: string;
  className?: string;
  data?: InfluencePredictionAnalysis | null;
  isLoading?: boolean;
  error?: Error | null;
}

const InfluencePredictionCard: React.FC<InfluencePredictionCardProps> = ({
  title = '影响力预测',
  className,
  data,
  isLoading = false,
  error = null,
}) => {
  // 获取置信度颜色
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // 获取影响方向颜色
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  // 计算预测百分比
  const predictionPercentage = useMemo(() => {
    if (!data) return 0;
    const { min, max, expected } = data.predictionRange;
    if (max === min) return 50;
    return ((expected - min) / (max - min)) * 100;
  }, [data]);

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
        <ChartState empty emptyText="暂无影响力预测数据" />
      </div>
    );
  }

  return (
    <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-lg p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

      <div className="space-y-6">
        {/* 预测结果 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">预测触达</div>
            <div className="text-2xl font-bold text-white">
              {data.predictedReach.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">预测转发</div>
            <div className="text-2xl font-bold text-white">
              {data.predictedReposts.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">预测互动</div>
            <div className="text-2xl font-bold text-white">
              {data.predictedEngagement.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 置信度 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">置信度</span>
            <span className={cn('text-lg font-bold', getConfidenceColor(data.confidenceLevel))}>
              {(data.confidence * 100).toFixed(0)}% ({data.confidenceLevel === 'high' ? '高' : data.confidenceLevel === 'medium' ? '中' : '低'})
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                data.confidenceLevel === 'high' ? 'bg-green-500' : data.confidenceLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${data.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* 预测区间 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">预测区间</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">最小: {data.predictionRange.min.toLocaleString()}</span>
            <span className="text-white font-semibold">{data.predictionRange.expected.toLocaleString()}</span>
            <span className="text-gray-500">最大: {data.predictionRange.max.toLocaleString()}</span>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2 relative">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{
                left: `${Math.min(100, (data.predictionRange.min / data.predictionRange.max) * 100)}%`,
                width: `${Math.max(0, ((data.predictionRange.max - data.predictionRange.min) / data.predictionRange.max) * 100)}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded"
              style={{ left: `${predictionPercentage}%` }}
            />
          </div>
        </div>

        {/* 影响因素 */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-3">影响因素</div>
          <div className="space-y-2">
            {data.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <span className={cn('text-lg', getImpactColor(factor.impact))}>
                    {factor.impact === 'positive' ? '↑' : factor.impact === 'negative' ? '↓' : '→'}
                  </span>
                  <span className="text-gray-300">{factor.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-xs">{factor.description}</span>
                  <div className="w-24 bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, factor.value * 100)}%` }}
                    />
                  </div>
                  <span className="text-white text-xs w-12 text-right">{(factor.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 相似案例 */}
        {data.similarCases.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-3">相似案例</div>
            <div className="space-y-2">
              {data.similarCases.slice(0, 3).map((similarCase, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-gray-700/30 rounded px-3 py-2">
                  <span className="text-gray-300">案例 {index + 1}</span>
                  <span className="text-gray-400">相似度: {(similarCase.similarity * 100).toFixed(0)}%</span>
                  <span className="text-gray-400">实际触达: {similarCase.actualReach.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 建议 */}
        {data.recommendations.length > 0 && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-3">优化建议</div>
            <ul className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span className="text-gray-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfluencePredictionCard;
