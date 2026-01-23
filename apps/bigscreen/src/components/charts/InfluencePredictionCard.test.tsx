import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfluencePredictionCard from './InfluencePredictionCard';
import type { InfluencePredictionAnalysis } from '@sker/sdk';

// Mock @/utils
vi.mock('@/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const mockData: InfluencePredictionAnalysis = {
  predictedReach: 10000,
  predictedReposts: 500,
  predictedEngagement: 1500,
  confidence: 0.8,
  confidenceLevel: 'high',
  factors: [
    {
      name: '用户粉丝数',
      weight: 0.25,
      value: 0.5,
      impact: 'positive',
      description: '用户拥有 50,000 个粉丝',
    },
    {
      name: '是否认证',
      weight: 0.10,
      value: 1,
      impact: 'positive',
      description: '已认证用户，可信度更高',
    },
  ],
  predictionRange: {
    min: 8000,
    max: 12000,
    expected: 10000,
  },
  similarCases: [
    {
      postId: '123',
      similarity: 0.9,
      actualReach: 9500,
      actualReposts: 480,
      actualEngagement: 1450,
    },
  ],
  recommendations: ['当前内容特征良好，继续保持'],
};

describe('InfluencePredictionCard', () => {
  it('应该渲染空数据状态', () => {
    const { container } = render(
      <InfluencePredictionCard data={null} isLoading={false} />
    );
    expect(screen.getByText('暂无影响力预测数据')).toBeInTheDocument();
  });

  it('应该渲染加载状态', () => {
    const { container } = render(
      <InfluencePredictionCard data={null} isLoading={true} />
    );
    expect(container.querySelector('.chart-state-loading')).toBeInTheDocument();
  });

  it('应该渲染错误状态', () => {
    const error = new Error('测试错误');
    render(
      <InfluencePredictionCard data={null} isLoading={false} error={error} />
    );
    expect(screen.getByText('测试错误')).toBeInTheDocument();
  });

  it('应该渲染正常数据', () => {
    render(
      <InfluencePredictionCard data={mockData} isLoading={false} />
    );

    // 检查预测结果
    expect(screen.getByText('10,000')).toBeInTheDocument(); // 预测触达
    expect(screen.getByText('500')).toBeInTheDocument(); // 预测转发
    expect(screen.getByText('1,500')).toBeInTheDocument(); // 预测互动

    // 检查置信度
    expect(screen.getByText(/80%/)).toBeInTheDocument();

    // 检查影响因素
    expect(screen.getByText('用户粉丝数')).toBeInTheDocument();
    expect(screen.getByText('是否认证')).toBeInTheDocument();

    // 检查相似案例
    expect(screen.getByText('相似案例')).toBeInTheDocument();
    expect(screen.getByText('案例 1')).toBeInTheDocument();

    // 检查建议
    expect(screen.getByText('优化建议')).toBeInTheDocument();
    expect(screen.getByText('当前内容特征良好，继续保持')).toBeInTheDocument();
  });

  it('应该正确显示置信度等级', () => {
    const { rerender } = render(
      <InfluencePredictionCard data={mockData} isLoading={false} />
    );

    // 高置信度
    expect(screen.getByText(/80% \(高\)/)).toBeInTheDocument();

    // 中置信度
    const mediumConfidenceData = { ...mockData, confidence: 0.5, confidenceLevel: 'medium' as const };
    rerender(<InfluencePredictionCard data={mediumConfidenceData} isLoading={false} />);
    expect(screen.getByText(/50% \(中\)/)).toBeInTheDocument();

    // 低置信度
    const lowConfidenceData = { ...mockData, confidence: 0.3, confidenceLevel: 'low' as const };
    rerender(<InfluencePredictionCard data={lowConfidenceData} isLoading={false} />);
    expect(screen.getByText(/30% \(低\)/)).toBeInTheDocument();
  });

  it('应该显示预测区间', () => {
    render(
      <InfluencePredictionCard data={mockData} isLoading={false} />
    );

    expect(screen.getByText(/最小: 8,000/)).toBeInTheDocument();
    expect(screen.getByText(/最大: 12,000/)).toBeInTheDocument();
  });

  it('应该在没有相似案例时隐藏相似案例部分', () => {
    const dataWithoutSimilarCases = { ...mockData, similarCases: [] };
    render(
      <InfluencePredictionCard data={dataWithoutSimilarCases} isLoading={false} />
    );

    expect(screen.queryByText('相似案例')).not.toBeInTheDocument();
  });

  it('应该在没有建议时隐藏建议部分', () => {
    const dataWithoutRecommendations = { ...mockData, recommendations: [] };
    render(
      <InfluencePredictionCard data={dataWithoutRecommendations} isLoading={false} />
    );

    expect(screen.queryByText('优化建议')).not.toBeInTheDocument();
  });

  it('应该显示影响因素的影响方向', () => {
    render(
      <InfluencePredictionCard data={mockData} isLoading={false} />
    );

    // 检查正面影响因素的向上箭头
    const positiveArrows = screen.getAllByText('↑');
    expect(positiveArrows.length).toBeGreaterThan(0);
  });

  it('应该显示自定义标题', () => {
    render(
      <InfluencePredictionCard data={mockData} isLoading={false} title="自定义标题" />
    );

    expect(screen.getByText('自定义标题')).toBeInTheDocument();
  });
});
