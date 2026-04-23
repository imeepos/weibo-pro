import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Activity } from 'lucide-react';
import { createAnalysisWidgetState } from '@/types/analysis-widget';
import { getMetricExplanation } from '@/constants/metric-explanations';
import { AnalysisWidgetCard } from './AnalysisWidgetCard';

vi.mock('@sker/ui/components/ui/popover', () => ({
  Popover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

describe('MetricExplainPopover and AnalysisWidgetCard', () => {
  it('renders explanation content and inline error state', () => {
    render(
      <AnalysisWidgetCard
        title="传播广度分析"
        icon={<Activity className="h-4 w-4" />}
        explanation={getMetricExplanation('spread-breadth')}
        state={createAnalysisWidgetState({ status: 'error', error: 'media failed' })}
        emptyText="暂无传播数据"
        onRetry={vi.fn()}
      >
        <div>chart body</div>
      </AnalysisWidgetCard>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '传播广度分析指标说明' }),
    );

    expect(screen.getAllByText('传播广度分析').length).toBeGreaterThan(0);
    expect(screen.getByText('传播广度指数')).toBeInTheDocument();
    expect(screen.getByText('media failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试传播广度分析' })).toBeInTheDocument();
  });
});
