import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SentimentTransition } from './SentimentTransition';

vi.mock('@sker/core', () => ({
  root: {
    get: vi.fn(),
  },
}));

vi.mock('../../hooks/useSentimentTransition', () => ({
  useSentimentTransition: vi.fn(() => ({
    data: null,
    loading: true,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe('SentimentTransition', () => {
  it('should render loading state initially', () => {
    const { container } = render(<SentimentTransition eventId="test-event-id" />);
    expect(container.textContent).toContain('Loading');
  });
});
