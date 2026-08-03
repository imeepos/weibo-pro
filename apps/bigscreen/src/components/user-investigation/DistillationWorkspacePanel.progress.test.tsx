import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DistillationWorkspacePanel } from './DistillationWorkspacePanel';
import { analyzingTask, crawlingTask } from './__fixtures__/distillationWorkspacePanelFixtures';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/charts/MemoryGraph', () => ({
  MemoryGraph: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
  default: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
}));

describe('DistillationWorkspacePanel - in-progress hints', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:05:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows in-progress hint and disables creating another task while one is running', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[crawlingTask]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getAllByText('已抓取帖子 0 条 · 最近进展 5 分钟前')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '蒸馏进行中...' })).toBeDisabled();
  });

  it('shows an explicit analyzing hint while profile generation is in progress', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[analyzingTask]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getAllByText('已抓取帖子 62 条 · 正在生成画像 · 最近进展 刚刚')).toHaveLength(2);
    expect(screen.getByText('正在生成画像，已等待 15 秒，当前样本帖子 62 条')).toBeInTheDocument();
  });
});
