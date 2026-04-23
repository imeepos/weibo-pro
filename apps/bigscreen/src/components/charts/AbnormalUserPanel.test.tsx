import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AbnormalUserPanel } from './AbnormalUserPanel';

describe('AbnormalUserPanel', () => {
  it('renders abnormal users and signal badges', () => {
    render(
      <AbnormalUserPanel
        data={[
          {
            userId: 'user-1',
            screenName: '用户A',
            followers: 24,
            verified: false,
            location: '北京',
            postCount: 12,
            riskLevel: 'high',
            riskScore: 84,
            confidence: 0.84,
            isAbnormal: true,
            accountType: 'bot',
            lastActive: '2026-04-23T01:00:00.000Z',
            summary: '检测到 3 个异常信号',
            abnormalSignals: [
              { type: 'night_activity', severity: 'medium', description: '凌晨发帖占比高', value: 0.5 },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('用户A')).toBeInTheDocument();
    expect(screen.getByText('检测到 3 个异常信号')).toBeInTheDocument();
    expect(screen.getByText('night_activity')).toBeInTheDocument();
    expect(screen.getByText('bot')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<AbnormalUserPanel data={[]} />);

    expect(screen.getByText('暂无异常用户')).toBeInTheDocument();
  });
});
