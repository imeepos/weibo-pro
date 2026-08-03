import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserRiskProfilePanel } from './UserRiskProfilePanel';

describe('UserRiskProfilePanel', () => {
  it('renders summary metrics and top signal label', () => {
    render(
      <UserRiskProfilePanel
        data={{
          totalUsers: 120,
          activeUsers: 67,
          abnormalUserCount: 8,
          averageRiskScore: 36.5,
          riskDistribution: { low: 90, medium: 22, high: 8 },
          topSignals: [{ type: 'night_activity', label: '夜间活跃', count: 6 }],
          topRiskUsers: [],
        }}
      />,
    );

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('36.5')).toBeInTheDocument();
    expect(screen.getByText('夜间活跃 6')).toBeInTheDocument();
    // 活跃用户恒等于参与用户（数据源即发帖用户），已移除无信息量卡片
    expect(screen.queryByText('67')).not.toBeInTheDocument();
  });
});
