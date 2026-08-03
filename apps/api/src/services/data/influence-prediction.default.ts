import type { InfluencePredictionAnalysis } from '@sker/sdk';
import type { FeatureWeights } from './influence-prediction.features';

/**
 * 无数据时的默认影响力预测分析结构
 */
export function getDefaultInfluencePredictionAnalysis(featureWeights: FeatureWeights): InfluencePredictionAnalysis {
  return {
    predictedReach: 0,
    predictedReposts: 0,
    predictedEngagement: 0,
    confidence: 0,
    confidenceLevel: 'low',
    factors: [
      { name: '用户粉丝数', weight: featureWeights.userFollowers, value: 0, impact: 'neutral', description: '暂无数据' },
      { name: '是否认证', weight: featureWeights.userVerified, value: 0, impact: 'neutral', description: '暂无数据' },
      { name: '内容长度', weight: featureWeights.contentLength, value: 0, impact: 'neutral', description: '暂无数据' },
      { name: '是否有媒体', weight: featureWeights.hasMedia, value: 0, impact: 'neutral', description: '暂无数据' },
      { name: '发布时间', weight: featureWeights.postingTime, value: 0, impact: 'neutral', description: '暂无数据' },
      { name: '话题热度', weight: featureWeights.topicHotness, value: 0, impact: 'neutral', description: '暂无数据' },
      { name: '初始互动', weight: featureWeights.initialEngagement, value: 0, impact: 'neutral', description: '暂无数据' },
    ],
    predictionRange: {
      min: 0,
      max: 0,
      expected: 0,
    },
    similarCases: [],
    recommendations: [],
  };
}
