import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DistillationWorkspacePanel } from './DistillationWorkspacePanel';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('DistillationWorkspacePanel', () => {
  it('renders latest task summary and persona evidence details', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[{
          id: 'task-1',
          weiboUserId: '100',
          eventId: 'event-1',
          status: 'published',
          historyWindowDays: 90,
          sourcePostCount: 20,
          sourceCommentCount: 2,
          sourceRepostCount: 3,
          evidenceSampleCount: 5,
          model: 'gpt-5',
          promptVersion: 'v1',
          distilledSummary: '短摘要',
          reviewStatus: 'auto_pass',
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          createdAt: '2026-04-23T00:00:00.000Z',
          updatedAt: '2026-04-23T00:00:00.000Z',
        }]}
        personaSummary={{
          id: 'persona-1',
          name: '用户A Persona',
          avatar: null,
          description: '人物画像',
          memoryCount: 4,
          createdAt: '2026-04-23T00:00:00.000Z',
        }}
        evidenceCount={3}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
      />,
    );

    expect(screen.getByText('短摘要')).toBeInTheDocument();
    expect(screen.getByText('用户A Persona')).toBeInTheDocument();
    expect(screen.getByText('证据 3 条')).toBeInTheDocument();
  });

  it('shows review actions for human pending tasks', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[{
          id: 'task-1',
          weiboUserId: '100',
          eventId: 'event-1',
          status: 'review_pending',
          historyWindowDays: 90,
          sourcePostCount: 20,
          sourceCommentCount: 2,
          sourceRepostCount: 3,
          evidenceSampleCount: 5,
          model: 'gpt-5',
          promptVersion: 'v1',
          distilledSummary: '短摘要',
          reviewStatus: 'human_pending',
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          createdAt: '2026-04-23T00:00:00.000Z',
          updatedAt: '2026-04-23T00:00:00.000Z',
        }]}
        personaSummary={null}
        evidenceCount={0}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getByText('人工通过')).toBeInTheDocument();
    expect(screen.getByText('人工拒绝')).toBeInTheDocument();
  });
});
