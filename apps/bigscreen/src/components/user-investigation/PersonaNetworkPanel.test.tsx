import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersonaNetworkPanel } from './PersonaNetworkPanel';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/hooks/usePersonaNetworkGraph', () => ({
  usePersonaNetworkGraph: () => ({
    graph: {
      personas: [
        {
          personaId: 'p1',
          weiboUserId: '100',
          name: '用户A Persona',
          avatar: null,
          riskLevel: 'high',
          riskScore: 87,
          traits: ['热点追逐'],
          memoryCount: 4,
          lastDistilledAt: '2026-04-23T00:00:00.000Z',
        },
        {
          personaId: 'p2',
          weiboUserId: '200',
          name: '用户B Persona',
          avatar: null,
          riskLevel: 'medium',
          riskScore: 63,
          traits: ['情绪放大'],
          memoryCount: 3,
          lastDistilledAt: '2026-04-23T00:00:00.000Z',
        },
      ],
      edges: [
        {
          id: 'e1',
          sourcePersonaId: 'p1',
          targetPersonaId: 'p2',
          edgeType: 'interaction',
          weight: 12,
          reason: '用户互动关系',
        },
      ],
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('PersonaNetworkPanel', () => {
  it('renders persona nodes and edge summary list', () => {
    render(<PersonaNetworkPanel onBackToInvestigation={vi.fn()} />);

    expect(screen.getByText('用户A Persona')).toBeInTheDocument();
    expect(screen.getByText('用户B Persona')).toBeInTheDocument();
    expect(screen.getByText('用户互动关系')).toBeInTheDocument();
    expect(screen.getByText('interaction · 权重 12')).toBeInTheDocument();
  });

  it('filters personas by risk level and edges by edge type', async () => {
    render(<PersonaNetworkPanel onBackToInvestigation={vi.fn()} />);

    expect(screen.getByText('用户A Persona')).toBeInTheDocument();
    expect(screen.getByText('用户B Persona')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '仅高风险' }));
    expect(screen.getByText('用户A Persona')).toBeInTheDocument();
    expect(screen.queryByText('用户B Persona')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '全部风险' }));
    fireEvent.click(screen.getByRole('button', { name: '仅互动边' }));
    expect(screen.getByText('用户互动关系')).toBeInTheDocument();
  });
});
