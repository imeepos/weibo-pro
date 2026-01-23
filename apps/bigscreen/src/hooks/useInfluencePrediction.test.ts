import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInfluencePrediction } from './useInfluencePrediction';
import { root } from '@sker/core';
import { InfluencePredictionController } from '@sker/sdk';
import type { InfluencePredictionAnalysis } from '@sker/sdk';

// Mock SDK controller
vi.mock('@sker/sdk', () => ({
  InfluencePredictionController: class {},
}));

// Mock root
vi.mock('@sker/core', async () => {
  const actual = await vi.importActual('@sker/core');
  return {
    ...actual,
    root: {
      get: vi.fn(),
    },
  };
});

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
      value: 50000,
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

describe('useInfluencePrediction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(root, 'get').mockReturnValue({
      getInfluencePrediction: vi.fn().mockResolvedValue(mockData),
    } as any);
  });

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useInfluencePrediction('test-event-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should have refetch function', () => {
    const { result } = renderHook(() => useInfluencePrediction('test-event-id'));

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle errors', async () => {
    vi.spyOn(root, 'get').mockReturnValue({
      getInfluencePrediction: vi.fn().mockRejectedValue(new Error('Network error')),
    } as any);

    const { result } = renderHook(() => useInfluencePrediction('test-event-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(expect.any(Error));
    expect(result.current.error?.message).toBe('Network error');
  });
});
