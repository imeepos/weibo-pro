import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DistillationWorkspacePanel } from './DistillationWorkspacePanel';
import {
  evidenceItem,
  memoryGraph,
  personaSummary,
  publishedTask,
} from './__fixtures__/distillationWorkspacePanelFixtures';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/charts/MemoryGraph', () => ({
  MemoryGraph: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
  default: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
}));

describe('DistillationWorkspacePanel - summary and evidence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:05:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders latest task summary and persona evidence details', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[publishedTask]}
        personaSummary={personaSummary}
        evidenceCount={3}
        evidenceItems={[evidenceItem]}
        memoryGraph={memoryGraph}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getByText('短摘要')).toBeInTheDocument();
    expect(screen.getByText('用户A Persona')).toBeInTheDocument();
    expect(screen.getByText('证据 3 条')).toBeInTheDocument();
    expect(screen.getByText('代表性帖子证据')).toBeInTheDocument();
    expect(screen.getByText('节点 2 个 · 关系 1 条')).toBeInTheDocument();
    expect(screen.getByText('热点追逐型')).toBeInTheDocument();
    expect(screen.getByTestId('memory-graph-preview')).toBeInTheDocument();
  });

  it('shows evidence detail when an evidence item is selected', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[]}
        personaSummary={personaSummary}
        evidenceCount={1}
        evidenceItems={[evidenceItem]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('代表性帖子证据'));

    expect(screen.getByText('证据明细')).toBeInTheDocument();
    expect(screen.getByText('来源 weibo_posts · p1')).toBeInTheDocument();
  });
});
