import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSentimentTransition } from './useSentimentTransition';
import { root } from '@sker/core';
import type { SentimentTransitionAnalysis } from '@sker/sdk';

// Mock SDK controller
vi.mock('@sker/sdk', () => ({
  SentimentTransitionController: class {},
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

const mockData: SentimentTransitionAnalysis = {
  timeline: [
    {
      timestamp: '2024-01-01T00:00:00Z',
      positive: 100,
      negative: 50,
      neutral: 30,
      dominantSentiment: 'positive',
      volatility: 0.2,
    },
  ],
  transitionMatrix: {
    positiveToPositive: 0.7,
    positiveToNegative: 0.2,
    positiveToNeutral: 0.1,
    negativeToPositive: 0.3,
    negativeToNegative: 0.5,
    negativeToNeutral: 0.2,
    neutralToPositive: 0.2,
    neutralToNegative: 0.2,
    neutralToNeutral: 0.6,
  },
  turningPoints: [],
  stabilityIndex: 0.6,
  polarizationIndex: 0.3,
};

describe('useSentimentTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(root, 'get').mockReturnValue({
      getAnalysis: vi.fn().mockResolvedValue(mockData),
    } as any);
  });

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useSentimentTransition('test-event-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should have refetch function', () => {
    const { result } = renderHook(() => useSentimentTransition('test-event-id'));

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle errors', async () => {
    vi.spyOn(root, 'get').mockReturnValue({
      getAnalysis: vi.fn().mockRejectedValue(new Error('Network error')),
    } as any);

    const { result } = renderHook(() => useSentimentTransition('test-event-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(expect.any(Error));
    expect(result.current.error?.message).toBe('Network error');
  });
});
