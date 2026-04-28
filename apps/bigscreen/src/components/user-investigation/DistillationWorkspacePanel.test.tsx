import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DistillationWorkspacePanel } from './DistillationWorkspacePanel';

vi.mock('@sker/ui/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/charts/MemoryGraph', () => ({
  MemoryGraph: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
  default: () => <div data-testid="memory-graph-preview">MemoryGraph Preview</div>,
}));

describe('DistillationWorkspacePanel', () => {
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
        evidenceItems={[{
          id: 'e1',
          memoryId: 'm1',
          sourceTable: 'weibo_posts',
          sourceId: 'p1',
          excerpt: '代表性帖子证据',
          evidenceType: 'direct_quote',
          score: 0.9,
          createdAt: '2026-04-23T00:00:00.000Z',
        }]}
        memoryGraph={{
          persona: {
            id: 'persona-1',
            name: '用户A Persona',
            avatar: null,
            description: '人物画像',
            traits: ['热点追逐'],
          },
          memories: [
            {
              id: 'm1',
              name: '热点追逐型',
              description: null,
              content: '长期追逐热点并放大情绪',
              type: 'insight',
              createdAt: '2026-04-23T00:00:00.000Z',
            },
            {
              id: 'm2',
              name: '情绪放大型',
              description: null,
              content: '偏好情绪化表达',
              type: 'concept',
              createdAt: '2026-04-23T00:00:00.000Z',
            },
          ],
          relations: [{
            id: 'r1',
            sourceId: 'm1',
            targetId: 'm2',
            relationType: 'related',
          }],
          tree: [],
          timeline: [],
          coordinationSignals: [],
          stats: {
            totalMemories: 2,
            totalEvents: 0,
            totalEvidencePosts: 1,
            totalWarnings: 0,
          },
        }}
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

  it('shows in-progress hint and disables creating another task while one is running', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[{
          id: 'task-1',
          weiboUserId: '100',
          eventId: null,
          status: 'crawling',
          historyWindowDays: 90,
          sourcePostCount: 0,
          sourceCommentCount: 0,
          sourceRepostCount: 0,
          evidenceSampleCount: 0,
          model: null,
          promptVersion: null,
          distilledSummary: null,
          reviewStatus: null,
          errorMessage: null,
          startedAt: '2026-04-23T00:00:00.000Z',
          completedAt: null,
          createdAt: '2026-04-23T00:00:00.000Z',
          updatedAt: '2026-04-23T00:00:00.000Z',
        }]}
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
        tasks={[{
          id: 'task-1',
          weiboUserId: '100',
          eventId: null,
          status: 'analyzing',
          historyWindowDays: 90,
          sourcePostCount: 62,
          sourceCommentCount: 0,
          sourceRepostCount: 0,
          evidenceSampleCount: 0,
          model: null,
          promptVersion: null,
          distilledSummary: '正在生成画像，已等待 15 秒，当前样本帖子 62 条',
          reviewStatus: null,
          errorMessage: null,
          startedAt: '2026-04-23T00:00:00.000Z',
          completedAt: null,
          createdAt: '2026-04-23T00:00:00.000Z',
          updatedAt: '2026-04-23T00:04:30.000Z',
        }]}
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

  it('shows detailed extraction counters and warnings while task is active', () => {
    const taskBase = {
      id: 'task-1',
      weiboUserId: '100',
      eventId: null,
      historyWindowDays: 90,
      sourcePostCount: 20,
      sourceCommentCount: 0,
      sourceRepostCount: 0,
      evidenceSampleCount: 0,
      model: null,
      promptVersion: null,
      reviewStatus: null,
      errorMessage: null,
      startedAt: '2026-04-28T01:00:00.000Z',
      completedAt: null,
      createdAt: '2026-04-28T01:00:00.000Z',
      updatedAt: '2026-04-28T01:05:00.000Z',
    };

    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[{
          ...taskBase,
          status: 'aggregating',
          distilledSummary: '正在聚合 20 条帖子提取结果',
          progress: {
            stage: 'aggregating',
            partial: true,
            latestMessage: '正在聚合 20 条帖子提取结果',
            lastProgressAt: '2026-04-28T01:05:00.000Z',
            counters: {
              crawledPosts: 20,
              reusedExtractions: 12,
              extractedPosts: 7,
              failedPosts: 1,
              eventClusterCount: 3,
              coordinationSignalCount: 1,
              warningCount: 2,
            },
            coverage: {
              latestPostAt: '2026-04-28T01:00:00.000Z',
              oldestPostAt: '2026-04-21T01:00:00.000Z',
            },
            recentWarnings: ['帖子 998 提取失败：timeout'],
          },
        }]}
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
        tasks={[{
          id: 'task-1',
          weiboUserId: '100',
          eventId: null,
          status: 'extracting',
          historyWindowDays: 90,
          sourcePostCount: 20,
          sourceCommentCount: 0,
          sourceRepostCount: 0,
          evidenceSampleCount: 0,
          model: null,
          promptVersion: null,
          distilledSummary: '正在逐帖抽取，已处理 8/20 条帖子',
          reviewStatus: null,
          errorMessage: null,
          startedAt: '2026-04-28T01:00:00.000Z',
          completedAt: null,
          createdAt: '2026-04-28T01:00:00.000Z',
          updatedAt: '2026-04-28T01:05:00.000Z',
          progress: {
            stage: 'extracting',
            partial: true,
            latestMessage: '正在逐帖抽取，已处理 8/20 条帖子',
            lastProgressAt: '2026-04-28T01:03:30.000Z',
            counters: {
              crawledPosts: 20,
              reusedExtractions: 4,
              extractedPosts: 3,
              failedPosts: 1,
              eventClusterCount: 0,
              coordinationSignalCount: 0,
              warningCount: 2,
            },
            coverage: {
              latestPostAt: '2026-04-28T01:00:00.000Z',
              oldestPostAt: '2026-04-21T01:00:00.000Z',
            },
            recentWarnings: ['帖子 998 提取失败：timeout'],
          },
        }]}
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

  it('triggers review callbacks when reviewer clicks action buttons', () => {
    const onReviewTask = vi.fn();

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

  it('shows evidence detail when an evidence item is selected', () => {
    render(
      <DistillationWorkspacePanel
        selectedUserId="100"
        tasks={[]}
        personaSummary={{
          id: 'persona-1',
          name: '用户A Persona',
          avatar: null,
          description: '人物画像',
          memoryCount: 4,
          createdAt: '2026-04-23T00:00:00.000Z',
        }}
        evidenceCount={1}
        evidenceItems={[{
          id: 'e1',
          memoryId: 'm1',
          sourceTable: 'weibo_posts',
          sourceId: 'p1',
          excerpt: '代表性帖子证据',
          evidenceType: 'direct_quote',
          score: 0.9,
          createdAt: '2026-04-23T00:00:00.000Z',
        }]}
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
