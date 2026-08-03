import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DistillationWorkspacePanel } from './DistillationWorkspacePanel';
import { reviewPendingTask } from './__fixtures__/distillationWorkspacePanelFixtures';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/charts/MemoryGraph', () => ({
  MemoryGraph: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
  default: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
}));

describe('DistillationWorkspacePanel - review actions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:05:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows review actions for human pending tasks', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[reviewPendingTask]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getByText('人工通过')).toBeInTheDocument();
    expect(screen.getByText('人工拒绝')).toBeInTheDocument();
  });

  it('triggers review callbacks when reviewer clicks action buttons', () => {
    const onReviewTask = vi.fn();

    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[reviewPendingTask]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={onReviewTask}
      />,
    );

    fireEvent.click(screen.getByText('人工通过'));
    fireEvent.click(screen.getByText('人工拒绝'));

    expect(onReviewTask).toHaveBeenNthCalledWith(1, 'task-1', 'approve');
    expect(onReviewTask).toHaveBeenNthCalledWith(2, 'task-1', 'reject');
  });
});
