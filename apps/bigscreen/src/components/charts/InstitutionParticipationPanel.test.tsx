import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InstitutionParticipationPanel } from './InstitutionParticipationPanel';

describe('InstitutionParticipationPanel', () => {
  it('renders institution type label and metrics', () => {
    render(
      <InstitutionParticipationPanel
        data={[
          {
            userId: 'user-1',
            screenName: '新华社',
            institutionType: 'state_media',
            verified: true,
            postCount: 5,
            interactionCount: 120,
            influenceScore: 9800,
            sentimentTilt: 'neutral',
          },
        ]}
      />,
    );

    expect(screen.getByText('新华社')).toBeInTheDocument();
    expect(screen.getByText('官方媒体')).toBeInTheDocument();
    expect(screen.getByText(/发帖 5 · 互动 120/)).toBeInTheDocument();
    expect(screen.getByText('9800')).toBeInTheDocument();
  });
});
