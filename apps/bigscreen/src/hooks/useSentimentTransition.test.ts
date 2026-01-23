import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSentimentTransition } from './useSentimentTransition';

// Mock SDK controller
vi.mock('@sker/sdk', () => ({
  SentimentTransitionController: vi.fn(),
}));

// Mock root
vi.mock('@sker/core', () => ({
  root: {
    get: vi.fn(),
  },
}));

describe('useSentimentTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useSentimentTransition('test-event-id'));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have refetch function', () => {
    const { result } = renderHook(() => useSentimentTransition('test-event-id'));

    expect(typeof result.current.refetch).toBe('function');
  });
});
