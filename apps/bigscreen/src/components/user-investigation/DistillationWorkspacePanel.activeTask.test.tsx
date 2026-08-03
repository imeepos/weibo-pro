import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DistillationWorkspacePanel } from './DistillationWorkspacePanel';
import {
  aggregatingTask,
  extractingTask,
  extractingTaskWithNonStringCoverage,
} from './__fixtures__/distillationWorkspacePanelFixtures';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/charts/MemoryGraph', () => ({
  MemoryGraph: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
  default: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
}));

describe('DistillationWorkspacePanel - active task progress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:05:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows detailed extraction counters and warnings while task is active', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[aggregatingTask]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getByText('已抓取 20 · 复用 12 · 新抽取 7 · 失败 1')).toBeInTheDocument();
    expect(screen.getByText('帖子 998 提取失败：timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '蒸馏进行中...' })).toBeDisabled();
  });

  it('shows task loading, background refresh, and coverage details while polling active progress', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[extractingTask]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        isTaskLoading
        isTaskRefreshing
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getByText('正在加载蒸馏任务状态...')).toBeInTheDocument();
    expect(screen.getByText('后台刷新中...')).toBeInTheDocument();
    expect(screen.getByText('阶段：逐帖抽取')).toBeInTheDocument();
    expect(screen.getByText('覆盖时间：2026-04-28 01:00 至 2026-04-21 01:00')).toBeInTheDocument();
    expect(screen.getByText('已处理 8 / 20 条帖子')).toBeInTheDocument();
    expect(screen.getByText('当前任务包含部分失败，系统会继续后续蒸馏。')).toBeInTheDocument();
  });

  it('tolerates non-string coverage timestamps in active task progress', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[extractingTaskWithNonStringCoverage]}
        personaSummary={null}
        evidenceCount={0}
        evidenceItems={[]}
        memoryGraph={null}
        onCreateTask={vi.fn()}
        onOpenGraphMode={vi.fn()}
        onReviewTask={vi.fn()}
      />,
    );

    expect(screen.getByText('覆盖时间：2026-04-28 01:00 至 2026-04-21 01:00')).toBeInTheDocument();
  });
});
