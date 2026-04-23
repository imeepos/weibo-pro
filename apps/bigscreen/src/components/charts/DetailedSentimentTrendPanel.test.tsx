import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetailedSentimentTrendPanel } from './DetailedSentimentTrendPanel';

vi.mock('./TimeSeriesChart', () => ({
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="time-series-chart">{JSON.stringify(data)}</div>
  ),
}));

describe('DetailedSentimentTrendPanel', () => {
  it('maps detailed sentiment points into time series chart data', () => {
    render(
      <DetailedSentimentTrendPanel
        data={[
          {
            timestamp: '2026-04-20T09:00:00.000Z',
            positive: 0.2,
            negative: 0.6,
            neutral: 0.2,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
    expect(screen.getByText(/"positive":20/)).toBeInTheDocument();
    expect(screen.getByText(/"negative":60/)).toBeInTheDocument();
    expect(screen.getByText(/"neutral":20/)).toBeInTheDocument();
  });
});
