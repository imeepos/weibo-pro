import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserEmotionInsightPanel } from './UserEmotionInsightPanel';

describe('UserEmotionInsightPanel', () => {
  it('renders user emotion insights', () => {
    render(
      <UserEmotionInsightPanel
        data={[
          {
            userId: 'user-1',
            screenName: '用户A',
            postCount: 3,
            emotionTilt: 'negative',
            summary: '高频负向发帖',
          },
        ]}
      />,
    );

    expect(screen.getByText('用户A')).toBeInTheDocument();
    expect(screen.getByText('高频负向发帖')).toBeInTheDocument();
    expect(screen.getByText('负向')).toBeInTheDocument();
  });
});
