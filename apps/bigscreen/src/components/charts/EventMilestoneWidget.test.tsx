import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventMilestoneWidget } from './EventMilestoneWidget';

vi.mock('./EventTimelineChart', () => ({
  default: ({ data }: { data: Array<{ event: string }> }) => (
    <div data-testid="event-timeline-chart">
      {data.map((item) => item.event).join(',')}
    </div>
  ),
}));

describe('EventMilestoneWidget', () => {
  it('maps milestone cards to timeline chart data', () => {
    render(
      <EventMilestoneWidget
        data={[
          {
            timestamp: '2026-04-20T09:00:00.000Z',
            type: 'heat_spike',
            title: '热度峰值',
            summary: '热度在该时间窗快速升高',
            confidence: 0.8,
            metrics: { hotness: 120, postCount: 60, userCount: 40 },
            representativePosts: [],
          },
        ]}
      />,
    );

    expect(screen.getByTestId('event-timeline-chart')).toBeInTheDocument();
    expect(screen.getByText(/热度峰值/)).toBeInTheDocument();
  });
});
