import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MemoryGraphPage from './MemoryGraphPage';
import { PersonaAPI } from '../services/api/persona';

vi.mock('../services/api/persona', () => ({
  PersonaAPI: {
    getList: vi.fn(),
    getMemoryGraph: vi.fn(),
  },
}));

vi.mock('../components/charts/MemoryGraph', () => ({
  __esModule: true,
  default: () => <div data-testid="memory-graph">MemoryGraph</div>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('MemoryGraphPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows time filters and coordination signals for the selected persona', async () => {
    vi.mocked(PersonaAPI.getList).mockResolvedValue([
      {
        id: 'persona-1',
        name: '画像A',
        avatar: null,
        description: '人物画像',
        memoryCount: 3,
        createdAt: '2026-04-28T01:00:00.000Z',
      },
    ]);

    vi.mocked(PersonaAPI.getMemoryGraph).mockResolvedValue({
      persona: {
        id: 'persona-1',
        name: '画像A',
        avatar: null,
        description: '人物画像',
        traits: [],
      },
      memories: [],
      relations: [],
      tree: [],
      timeline: [
        {
          bucketStart: '2026-04-28T01:00:00.000Z',
          bucketEnd: '2026-04-28T02:00:00.000Z',
          postCount: 12,
          sameContentCount: 8,
          eventCount: 2,
        },
      ],
      coordinationSignals: [
        {
          id: 'signal-1',
          label: '疑似协同传播',
          level: 'high',
          eventKey: 'event-a',
          timeRange: {
            startAt: '2026-04-28T01:00:00.000Z',
            endAt: '2026-04-28T01:30:00.000Z',
          },
          relatedPostCount: 8,
          description: '同一事件窗口内发现 8 条高同质内容',
        },
      ],
      stats: {
        totalMemories: 10,
        totalEvents: 2,
        totalEvidencePosts: 12,
        totalWarnings: 1,
      },
    });

    render(<MemoryGraphPage />);
    fireEvent.click(await screen.findByText('画像A'));

    expect(await screen.findByText('疑似协同传播')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 天' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '90 天' })).toBeInTheDocument();
  });
});
