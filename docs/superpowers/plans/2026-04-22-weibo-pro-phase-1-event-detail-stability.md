# Weibo-Pro Phase 1 Event Detail Stability and Metric Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize `EventDetail` widget loading, add reusable metric explanation UI, and strengthen the existing overview network summary without introducing any new backend APIs.

**Architecture:** This plan is intentionally limited to Phase 1 of the approved design because the full spec spans four independent subsystems. All changes stay inside `apps/bigscreen` and reuse the current SDK controller contracts. The implementation introduces a small typed widget-state helper, a frontend metric-explanation registry, and reusable widget-shell UI so `EventDetail` can degrade per widget instead of failing per tab.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, `@sker/ui` popover/button/spinner/chart-state primitives, existing `@sker/sdk` controllers

---

## Scope Split

The approved design document covers four independent delivery slices:

1. Phase 1: stability and metric clarity
2. Phase 2: event milestones, topic presentation, institution participation
3. Phase 3: opinion clusters and detailed sentiment modules
4. Phase 4: user monitoring redesign

This plan covers **only Phase 1** so it remains independently shippable and testable.

## Planned File Map

- Create: `apps/bigscreen/src/types/analysis-widget.ts`
  Responsibility: typed per-widget loading state helpers for `Promise.allSettled` results
- Create: `apps/bigscreen/src/types/analysis-widget.test.ts`
  Responsibility: verifies widget-state helper behavior for success, empty, and error cases
- Create: `apps/bigscreen/src/constants/metric-explanations.ts`
  Responsibility: single source of truth for Phase 1 metric definitions and labels
- Create: `apps/bigscreen/src/constants/metric-explanations.test.ts`
  Responsibility: verifies required Phase 1 explanation entries exist
- Create: `apps/bigscreen/src/components/ui/MetricExplainPopover.tsx`
  Responsibility: reusable popover entry for metric definitions
- Create: `apps/bigscreen/src/components/ui/AnalysisWidgetCard.tsx`
  Responsibility: standard widget header, explanation trigger, retry affordance, and inline loading/empty/error states
- Create: `apps/bigscreen/src/components/ui/MetricExplainPopover.test.tsx`
  Responsibility: verifies explanation trigger, content rendering, and widget-shell states
- Create: `apps/bigscreen/src/pages/DataOverview.test.tsx`
  Responsibility: verifies the overview page surfaces a clearly labeled network summary section
- Modify: `apps/bigscreen/src/components/ui/index.ts`
  Responsibility: export new UI helpers
- Modify: `apps/bigscreen/src/pages/EventDetail.tsx`
  Responsibility: move `trend` and `sentiment` tabs to widget-level state and explanation-aware cards
- Modify: `apps/bigscreen/src/pages/EventDetail.test.tsx`
  Responsibility: add regression coverage for partial widget failure and explanation triggers
- Modify: `apps/bigscreen/src/components/charts/UserRelationOverview.tsx`
  Responsibility: show lightweight summary badges from existing `network.statistics`
- Modify: `apps/bigscreen/src/pages/DataOverview.tsx`
  Responsibility: add a titled wrapper so the network section reads as an explicit summary area

## Task 1: Add Typed Widget-State Helpers

**Files:**
- Create: `apps/bigscreen/src/types/analysis-widget.ts`
- Test: `apps/bigscreen/src/types/analysis-widget.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  createAnalysisWidgetState,
  resolveAnalysisWidgetState,
} from './analysis-widget';

describe('analysis-widget helpers', () => {
  it('maps settled promises to success, empty, and error states', () => {
    const success = resolveAnalysisWidgetState(
      { status: 'fulfilled', value: [1, 2, 3] },
      (value) => value.length === 0,
    );
    expect(success).toEqual({
      status: 'success',
      data: [1, 2, 3],
      error: null,
    });

    const empty = resolveAnalysisWidgetState(
      { status: 'fulfilled', value: [] as number[] },
      (value) => value.length === 0,
    );
    expect(empty).toEqual({
      status: 'empty',
      data: [],
      error: null,
    });

    const failure = resolveAnalysisWidgetState<number[]>(
      { status: 'rejected', reason: new Error('media failed') },
      (value) => value.length === 0,
    );
    expect(failure).toEqual({
      status: 'error',
      data: null,
      error: 'media failed',
    });

    expect(createAnalysisWidgetState<number[]>()).toEqual({
      status: 'idle',
      data: null,
      error: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/types/analysis-widget.test.ts`

Expected: FAIL with `Cannot find module './analysis-widget'` or missing export errors.

- [ ] **Step 3: Write minimal implementation**

```ts
export type AnalysisWidgetStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error';

export interface AnalysisWidgetState<T> {
  status: AnalysisWidgetStatus;
  data: T | null;
  error: string | null;
}

export const createAnalysisWidgetState = <T,>(
  overrides: Partial<AnalysisWidgetState<T>> = {},
): AnalysisWidgetState<T> => ({
  status: 'idle',
  data: null,
  error: null,
  ...overrides,
});

export function resolveAnalysisWidgetState<T>(
  result: PromiseSettledResult<T>,
  isEmpty: (value: T) => boolean,
): AnalysisWidgetState<T> {
  if (result.status === 'rejected') {
    return createAnalysisWidgetState({
      status: 'error',
      error:
        result.reason instanceof Error
          ? result.reason.message
          : '加载失败',
    });
  }

  if (isEmpty(result.value)) {
    return createAnalysisWidgetState({
      status: 'empty',
      data: result.value,
    });
  }

  return createAnalysisWidgetState({
    status: 'success',
    data: result.value,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/types/analysis-widget.test.ts`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/bigscreen/src/types/analysis-widget.ts apps/bigscreen/src/types/analysis-widget.test.ts
git commit -m "test: add analysis widget state helpers"
```

## Task 2: Add Metric Explanation Registry and Reusable Widget Shell

**Files:**
- Create: `apps/bigscreen/src/constants/metric-explanations.ts`
- Create: `apps/bigscreen/src/constants/metric-explanations.test.ts`
- Create: `apps/bigscreen/src/components/ui/MetricExplainPopover.tsx`
- Create: `apps/bigscreen/src/components/ui/AnalysisWidgetCard.tsx`
- Create: `apps/bigscreen/src/components/ui/MetricExplainPopover.test.tsx`
- Modify: `apps/bigscreen/src/components/ui/index.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/bigscreen/src/constants/metric-explanations.test.ts
import { describe, expect, it } from 'vitest';
import {
  getMetricExplanation,
  metricExplanationRegistry,
} from './metric-explanations';

describe('metric explanation registry', () => {
  it('contains all Phase 1 explanation groups', () => {
    expect(metricExplanationRegistry['spread-breadth'].definitions[0]?.key).toBe(
      'uniqueReposters',
    );
    expect(
      getMetricExplanation('sentiment-transition').definitions.some(
        (item) => item.key === 'stabilityIndex',
      ),
    ).toBe(true);
    expect(
      getMetricExplanation('anomaly-timeline').definitions.some(
        (item) => item.key === 'confidence',
      ),
    ).toBe(true);
  });
});
```

```tsx
// apps/bigscreen/src/components/ui/MetricExplainPopover.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Activity } from 'lucide-react';
import { createAnalysisWidgetState } from '@/types/analysis-widget';
import { getMetricExplanation } from '@/constants/metric-explanations';
import { AnalysisWidgetCard } from './AnalysisWidgetCard';

vi.mock('@sker/ui/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

describe('MetricExplainPopover and AnalysisWidgetCard', () => {
  it('renders explanation content and inline error state', () => {
    render(
      <AnalysisWidgetCard
        title="传播广度分析"
        icon={<Activity className="h-4 w-4" />}
        explanation={getMetricExplanation('spread-breadth')}
        state={createAnalysisWidgetState({ status: 'error', error: 'media failed' })}
        emptyText="暂无传播数据"
        onRetry={vi.fn()}
      >
        <div>chart body</div>
      </AnalysisWidgetCard>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '传播广度分析指标说明' }),
    );

    expect(screen.getByText('传播广度分析')).toBeInTheDocument();
    expect(screen.getByText('传播广度指数')).toBeInTheDocument();
    expect(screen.getByText('media failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试传播广度分析' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/constants/metric-explanations.test.ts src/components/ui/MetricExplainPopover.test.tsx`

Expected: FAIL with missing-module errors for the registry and UI components.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/bigscreen/src/constants/metric-explanations.ts
export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  interpretation: string;
  dataSource: string;
}

export interface MetricExplanation {
  title: string;
  summary: string;
  definitions: MetricDefinition[];
}

export const metricExplanationRegistry = {
  'spread-breadth': {
    title: '传播广度分析',
    summary: '解释转发覆盖面、层级扩散能力与广度指数的当前计算口径。',
    definitions: [
      {
        key: 'uniqueReposters',
        label: '独立转发者',
        description: '去重后的转发用户数量，用于反映真实扩散覆盖面。',
        interpretation: '数值越高，说明传播覆盖到的独立用户越多。',
        dataSource: 'SpreadBreadthController.getAnalysis',
      },
      {
        key: 'spreadDepth',
        label: '传播深度',
        description: '转发链路达到的最大层级。',
        interpretation: '数值越高，说明信息被多层接力传播。',
        dataSource: 'SpreadBreadthController.getAnalysis',
      },
      {
        key: 'breadthIndex',
        label: '传播广度指数',
        description: '当前服务按覆盖率、深度和宽度加权计算的综合指标。',
        interpretation: '接近 1 代表广泛扩散，接近 0 代表扩散有限。',
        dataSource: 'SpreadBreadthController.getAnalysis',
      },
    ],
  },
  'anomaly-timeline': {
    title: '异常检测时间线',
    summary: '解释异常点当前值、预期值与置信度的含义。',
    definitions: [
      {
        key: 'value',
        label: '当前值',
        description: '当前时间点实际观测到的指标值。',
        interpretation: '与预期值差异越大，越可能被识别为异常。',
        dataSource: 'EventsController.getAnomalies',
      },
      {
        key: 'expected',
        label: '预期值',
        description: '基于历史趋势估算出的正常区间参考值。',
        interpretation: '用于对比当前值是否异常偏高或偏低。',
        dataSource: 'EventsController.getAnomalies',
      },
      {
        key: 'confidence',
        label: '置信度',
        description: '当前异常点被识别为异常的可信程度。',
        interpretation: '越接近 100%，越说明该异常点更值得关注。',
        dataSource: 'EventsController.getAnomalies',
      },
    ],
  },
  'sentiment-transition': {
    title: '情感转变追踪',
    summary: '解释稳定性、极化和分析元数据的当前口径。',
    definitions: [
      {
        key: 'stabilityIndex',
        label: '稳定性指数',
        description: '情感时间线波动程度的综合结果。',
        interpretation: '越高说明情感结构更稳定，越低说明波动更强。',
        dataSource: 'SentimentTransitionController.getAnalysis',
      },
      {
        key: 'polarizationIndex',
        label: '极化指数',
        description: '正负情绪两端对立程度的综合结果。',
        interpretation: '越高说明观点越分裂，越低说明情绪更集中或更中性。',
        dataSource: 'SentimentTransitionController.getAnalysis',
      },
      {
        key: 'skippedBoundaryPoints',
        label: '跳过边界点',
        description: '当前算法因窗口不足而跳过的时间点数量。',
        interpretation: '用于说明分析样本点与原始时间点之间的差异。',
        dataSource: 'SentimentTransitionController.getAnalysis',
      },
    ],
  },
} satisfies Record<string, MetricExplanation>;

export type MetricExplanationKey = keyof typeof metricExplanationRegistry;

export const getMetricExplanation = (key: MetricExplanationKey) =>
  metricExplanationRegistry[key];
```

```tsx
// apps/bigscreen/src/components/ui/MetricExplainPopover.tsx
import { Info } from 'lucide-react';
import { Button } from '@sker/ui/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@sker/ui/components/ui/popover';
import type { MetricExplanation } from '@/constants/metric-explanations';

interface MetricExplainPopoverProps {
  explanation: MetricExplanation;
}

export const MetricExplainPopover: React.FC<MetricExplainPopoverProps> = ({
  explanation,
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full"
        aria-label={`${explanation.title}指标说明`}
      >
        <Info className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-96 space-y-3">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{explanation.title}</h4>
        <p className="text-xs text-muted-foreground">{explanation.summary}</p>
      </div>
      <div className="space-y-3">
        {explanation.definitions.map((item) => (
          <div key={item.key} className="rounded-md border border-border/60 p-3">
            <div className="text-xs font-semibold text-foreground">{item.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
            <div className="mt-2 text-[11px] text-foreground/80">
              解释：{item.interpretation}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              数据源：{item.dataSource}
            </div>
          </div>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);
```

```tsx
// apps/bigscreen/src/components/ui/AnalysisWidgetCard.tsx
import { RefreshCw } from 'lucide-react';
import { Spinner } from '@sker/ui/components/ui/spinner';
import { Button } from '@sker/ui/components/ui/button';
import { cn } from '@/utils';
import type { AnalysisWidgetState } from '@/types/analysis-widget';
import type { MetricExplanation } from '@/constants/metric-explanations';
import { MetricExplainPopover } from './MetricExplainPopover';

interface AnalysisWidgetCardProps {
  title: string;
  icon: React.ReactNode;
  state: AnalysisWidgetState<unknown>;
  emptyText: string;
  explanation?: MetricExplanation;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const AnalysisWidgetCard: React.FC<AnalysisWidgetCardProps> = ({
  title,
  icon,
  state,
  emptyText,
  explanation,
  onRetry,
  children,
  className,
}) => {
  const renderBody = () => {
    if (state.status === 'loading' || state.status === 'idle') {
      return (
        <div className="flex min-h-[220px] items-center justify-center">
          <div className="text-center">
            <Spinner className="mx-auto h-5 w-5" />
            <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-destructive">{state.error ?? '加载失败'}</p>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              aria-label={`重试${title}`}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
          ) : null}
        </div>
      );
    }

    if (state.status === 'empty') {
      return (
        <div className="flex min-h-[220px] items-center justify-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      );
    }

    return children;
  };

  return (
    <div className={cn('rounded-xl border border-border/40 bg-muted/20 p-5', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </h3>
        {explanation ? <MetricExplainPopover explanation={explanation} /> : null}
      </div>
      {renderBody()}
    </div>
  );
};
```

```ts
// apps/bigscreen/src/components/ui/index.ts
export { ErrorState } from './ErrorState';
export { EmptyState } from './EmptyState';
export { MetricExplainPopover } from './MetricExplainPopover';
export { AnalysisWidgetCard } from './AnalysisWidgetCard';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/constants/metric-explanations.test.ts src/components/ui/MetricExplainPopover.test.tsx`

Expected: PASS with both new test files green.

- [ ] **Step 5: Commit**

```bash
git add apps/bigscreen/src/constants/metric-explanations.ts apps/bigscreen/src/constants/metric-explanations.test.ts apps/bigscreen/src/components/ui/MetricExplainPopover.tsx apps/bigscreen/src/components/ui/AnalysisWidgetCard.tsx apps/bigscreen/src/components/ui/MetricExplainPopover.test.tsx apps/bigscreen/src/components/ui/index.ts
git commit -m "feat: add metric explanation widget shell"
```

## Task 3: Refactor `EventDetail` Trend and Sentiment Tabs to Widget-Level Resilience

**Files:**
- Modify: `apps/bigscreen/src/pages/EventDetail.tsx`
- Modify: `apps/bigscreen/src/pages/EventDetail.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it('keeps successful trend widgets visible when one trend request fails', async () => {
  const spreadController = {
    getAnalysis: vi.fn().mockResolvedValue({
      totalReposts: 100,
      uniqueReposters: 80,
      spreadDepth: 5,
      spreadWidth: 4.5,
      breadthIndex: 0.75,
      propagationPaths: [],
      spreadTimeline: [],
      repostByUserType: [],
    }),
  };

  const mediaController = {
    getDistribution: vi.fn().mockRejectedValue(new Error('media failed')),
  };

  vi.mocked(root.get).mockImplementation((token: any) => {
    if (token === EventsController) return mockEventsController as any;
    if (token.name === 'SpreadBreadthController') return spreadController as any;
    if (token.name === 'MediaTypeController') return mediaController as any;
    if (token.name === 'CommunityDetectionController') {
      return { getAnalysis: vi.fn().mockResolvedValue({ communities: [] }) } as any;
    }
    return {} as any;
  });

  render(
    <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
      <EventDetail />
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('tab', { name: '趋势分析' }));

  expect(await screen.findByTestId('spread-breadth-chart')).toBeInTheDocument();
  expect(await screen.findByText('media failed')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '重试媒体类型分布' }),
  ).toBeInTheDocument();
});

it('renders metric explanation triggers for trend and sentiment widgets', async () => {
  render(
    <MemoryRouter initialEntries={[`/event/${mockEventId}`]}>
      <EventDetail />
    </MemoryRouter>,
  );

  fireEvent.click(await screen.findByRole('tab', { name: '趋势分析' }));
  expect(
    await screen.findByRole('button', { name: '传播广度分析指标说明' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: '情感分析' }));
  expect(
    await screen.findByRole('button', { name: '情感转变追踪指标说明' }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/pages/EventDetail.test.tsx`

Expected: FAIL because `EventDetail` still fails at the tab level and does not render the new explanation triggers.

- [ ] **Step 3: Write minimal implementation**

```tsx
// imports near the top of EventDetail.tsx
import type {
  EventAnomaly,
  MediaTypeAnalysis,
  SpreadBreadthAnalysis,
} from '@sker/sdk';
import {
  createAnalysisWidgetState,
  resolveAnalysisWidgetState,
  type AnalysisWidgetState,
} from '@/types/analysis-widget';
import { getMetricExplanation } from '@/constants/metric-explanations';
import { AnalysisWidgetCard } from '@/components/ui';

type TrendWidgets = {
  spreadBreadth: AnalysisWidgetState<SpreadBreadthAnalysis>;
  mediaType: AnalysisWidgetState<MediaTypeAnalysis>;
  anomalies: AnalysisWidgetState<EventAnomaly[]>;
};

type SentimentWidgets = {
  transition: AnalysisWidgetState<{ eventId: string }>;
  scatter: AnalysisWidgetState<
    Array<{
      postId: string;
      sentimentScore: number;
      hotness: number;
      timestamp: string;
    }>
  >;
  intensity: AnalysisWidgetState<
    Array<{
      intensity: number;
      count: number;
    }>
  >;
};

const [trendWidgets, setTrendWidgets] = useState<TrendWidgets>({
  spreadBreadth: createAnalysisWidgetState(),
  mediaType: createAnalysisWidgetState(),
  anomalies: createAnalysisWidgetState(),
});

const [sentimentWidgets, setSentimentWidgets] = useState<SentimentWidgets>({
  transition: createAnalysisWidgetState(),
  scatter: createAnalysisWidgetState(),
  intensity: createAnalysisWidgetState(),
});

const loadTrendWidgets = useCallback(async () => {
  if (!eventId) return;

  setTrendWidgets({
    spreadBreadth: createAnalysisWidgetState({ status: 'loading' }),
    mediaType: createAnalysisWidgetState({ status: 'loading' }),
    anomalies: createAnalysisWidgetState({ status: 'loading' }),
  });

  const eventsController = root.get(EventsController);
  const spreadBreadthController = root.get(SpreadBreadthController);
  const mediaTypeController = root.get(MediaTypeController);

  const settled = await Promise.allSettled([
    spreadBreadthController.getAnalysis(eventId),
    mediaTypeController.getDistribution(eventId),
    eventsController.getAnomalies(eventId),
  ]);

  setTrendWidgets({
    spreadBreadth: resolveAnalysisWidgetState(
      settled[0] as PromiseSettledResult<SpreadBreadthAnalysis>,
      (value) =>
        value.totalReposts === 0 &&
        !value.aggregatedPropagation?.nodes?.length,
    ),
    mediaType: resolveAnalysisWidgetState(
      settled[1] as PromiseSettledResult<MediaTypeAnalysis>,
      (value) => value.distribution.length === 0,
    ),
    anomalies: resolveAnalysisWidgetState(
      settled[2] as PromiseSettledResult<EventAnomaly[]>,
      (value) => value.length === 0,
    ),
  });
}, [eventId]);

const loadSentimentWidgets = useCallback(async () => {
  if (!eventId) return;

  setSentimentWidgets({
    transition: createAnalysisWidgetState({ status: 'loading' }),
    scatter: createAnalysisWidgetState({ status: 'loading' }),
    intensity: createAnalysisWidgetState({ status: 'loading' }),
  });

  const eventsController = root.get(EventsController);
  const settled = await Promise.allSettled([
    Promise.resolve({ eventId }),
    eventsController.getSentimentHotness(eventId),
    eventsController.getSentimentIntensity(eventId),
  ]);

  setSentimentWidgets({
    transition: resolveAnalysisWidgetState(
      settled[0] as PromiseSettledResult<{ eventId: string }>,
      () => false,
    ),
    scatter: resolveAnalysisWidgetState(
      settled[1] as PromiseSettledResult<
        Array<{
          postId: string;
          sentimentScore: number;
          hotness: number;
          timestamp: string;
        }>
      >,
      (value) => value.length === 0,
    ),
    intensity: resolveAnalysisWidgetState(
      settled[2] as PromiseSettledResult<
        Array<{
          intensity: number;
          count: number;
        }>
      >,
      (value) => value.length === 0,
    ),
  });
}, [eventId]);
```

```tsx
// replace the existing trend tab content
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
  <AnalysisWidgetCard
    title="传播广度分析"
    icon={<Activity className="h-4 w-4" />}
    explanation={getMetricExplanation('spread-breadth')}
    state={trendWidgets.spreadBreadth}
    emptyText="暂无传播广度数据"
    onRetry={loadTrendWidgets}
  >
    <SpreadBreadthChart data={trendWidgets.spreadBreadth.data} height={500} />
  </AnalysisWidgetCard>

  <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
    <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Activity className="h-4 w-4" />
      核心指标时间趋势
    </h3>
    <MultiMetricTrendChart data={engagementTrendData} height={380} />
  </div>

  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <AnalysisWidgetCard
      title="媒体类型分布"
      icon={<BarChart3 className="h-4 w-4" />}
      state={trendWidgets.mediaType}
      emptyText="暂无媒体类型数据"
      onRetry={loadTrendWidgets}
    >
      <MediaTypeDistribution data={trendWidgets.mediaType.data} height={350} />
    </AnalysisWidgetCard>

    <AnalysisWidgetCard
      title="异常检测时间线"
      icon={<AlertTriangle className="h-4 w-4" />}
      explanation={getMetricExplanation('anomaly-timeline')}
      state={trendWidgets.anomalies}
      emptyText="暂无异常检测数据"
      onRetry={loadTrendWidgets}
    >
      <AnomalyTimelineChart data={trendWidgets.anomalies.data ?? []} height={350} />
    </AnalysisWidgetCard>
  </div>
</motion.div>
```

```tsx
// replace the existing sentiment tab content
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
  <AnalysisWidgetCard
    title="情感转变追踪"
    icon={<Heart className="h-4 w-4" />}
    explanation={getMetricExplanation('sentiment-transition')}
    state={sentimentWidgets.transition}
    emptyText="暂无情感转变数据"
    onRetry={loadSentimentWidgets}
  >
    <SentimentTransition eventId={eventId!} />
  </AnalysisWidgetCard>

  <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
    <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Heart className="h-4 w-4" />
      情感变化趋势
    </h3>
    <TimeSeriesChart data={timeSeriesData} title="" height={320} />
  </div>

  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <AnalysisWidgetCard
      title="情感-热度关联"
      icon={<Target className="h-4 w-4" />}
      state={sentimentWidgets.scatter}
      emptyText="暂无情感热度数据"
      onRetry={loadSentimentWidgets}
    >
      <SentimentHotnessScatterChart data={sentimentWidgets.scatter.data ?? []} height={350} />
    </AnalysisWidgetCard>

    <AnalysisWidgetCard
      title="情感强度谱"
      icon={<Zap className="h-4 w-4" />}
      state={sentimentWidgets.intensity}
      emptyText="暂无情感强度数据"
      onRetry={loadSentimentWidgets}
    >
      <SentimentIntensityChart data={sentimentWidgets.intensity.data ?? []} height={350} />
    </AnalysisWidgetCard>
  </div>
</motion.div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/pages/EventDetail.test.tsx`

Expected: PASS with the new partial-failure and explanation-trigger tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/bigscreen/src/pages/EventDetail.tsx apps/bigscreen/src/pages/EventDetail.test.tsx
git commit -m "refactor: isolate event detail widget failures"
```

## Task 4: Surface a Clear Overview Network Summary

**Files:**
- Create: `apps/bigscreen/src/pages/DataOverview.test.tsx`
- Modify: `apps/bigscreen/src/components/charts/UserRelationOverview.tsx`
- Modify: `apps/bigscreen/src/pages/DataOverview.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DataOverview from './DataOverview';

vi.mock('@/hooks/useOverviewData', () => ({
  useOverviewData: () => ({
    statsOverviewData: {
      events: { value: 12, change: 5 },
      posts: { value: 120, change: 10 },
      users: { value: 48, change: 3 },
      interactions: { value: 300, change: 18 },
    },
    sentimentData: {
      positive: 30,
      negative: 10,
      neutral: 60,
      total: 100,
      positivePercentage: 30,
      negativePercentage: 10,
      neutralPercentage: 60,
      trend: 'stable',
      avgScore: 0.2,
    },
    loading: false,
    error: null,
    isStale: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useChartData', () => ({
  useWordCloudData: () => ({ data: [] }),
}));

vi.mock('@sker/core', () => ({
  root: {
    get: () => ({
      getLocations: vi.fn().mockResolvedValue([]),
    }),
  },
  createLogger: () => ({ error: vi.fn() }),
}));

vi.mock('@/components', () => ({
  UserRelationOverview: () => (
    <div data-testid="user-relation-overview">network summary</div>
  ),
}));

describe('DataOverview', () => {
  it('labels the network section as a summary area', async () => {
    render(<DataOverview />);

    expect(await screen.findByText('用户网络摘要')).toBeInTheDocument();
    expect(
      screen.getByText('关系强度与社区规模快速概览'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('user-relation-overview')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/pages/DataOverview.test.tsx`

Expected: FAIL because the page does not yet render the explicit `用户网络摘要` title and subtitle.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/bigscreen/src/components/charts/UserRelationOverview.tsx
const summaryItems = useMemo(() => {
  const stats = network?.statistics;
  if (!stats) return [];

  return [
    {
      label: '网络节点',
      value: stats.totalUsers.toLocaleString('zh-CN'),
    },
    {
      label: '关系边',
      value: stats.totalRelations.toLocaleString('zh-CN'),
    },
    {
      label: '社区数',
      value: (stats.communities ?? 0).toLocaleString('zh-CN'),
    },
  ];
}, [network?.statistics]);

return (
  <div className={`h-full w-full overflow-hidden relative ${className}`}>
    {fullscreenButton}
    {summaryItems.length > 0 ? (
      <div className="absolute inset-x-3 top-3 z-10 grid grid-cols-3 gap-2">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-border/60 bg-background/85 px-3 py-2 backdrop-blur-sm"
          >
            <div className="text-[11px] text-muted-foreground">{item.label}</div>
            <div className="text-sm font-semibold text-foreground">{item.value}</div>
          </div>
        ))}
      </div>
    ) : null}
    <div className="h-full w-full pt-16">
      <UserRelationGraph3DOffscreen
        network={network}
        className="h-full w-full"
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        edgeThreshold={edgeThreshold}
      />
    </div>
  </div>
);
```

```tsx
// apps/bigscreen/src/pages/DataOverview.tsx
<div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden">
  <div className="border-b border-border/60 px-4 py-3">
    <h2 className="text-sm font-semibold text-foreground">用户网络摘要</h2>
    <p className="text-xs text-muted-foreground">
      关系强度与社区规模快速概览
    </p>
  </div>
  <div className="h-[calc(100%-61px)] p-4 pt-3">
    <UserRelationOverview className="h-full" />
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @sker/bigscreen exec vitest run src/pages/DataOverview.test.tsx`

Expected: PASS with the explicit network summary copy rendered.

- [ ] **Step 5: Commit**

```bash
git add apps/bigscreen/src/components/charts/UserRelationOverview.tsx apps/bigscreen/src/pages/DataOverview.tsx apps/bigscreen/src/pages/DataOverview.test.tsx
git commit -m "feat: highlight overview network summary"
```

## Verification Commands

Run these after Task 4, before handing off or merging:

```bash
pnpm --filter @sker/bigscreen exec vitest run src/types/analysis-widget.test.ts src/constants/metric-explanations.test.ts src/components/ui/MetricExplainPopover.test.tsx src/pages/EventDetail.test.tsx src/pages/DataOverview.test.tsx
pnpm --filter @sker/bigscreen run type-checks
pnpm --filter @sker/bigscreen run lint
```

Expected:

- all targeted Vitest suites PASS
- `tsc --noEmit` exits 0
- ESLint exits 0

## Follow-Up Plans Not Covered Here

Write separate plans after this phase lands:

1. Phase 2 plan for event milestones, topic presentation refinement, and institution participation
2. Phase 3 plan for opinion clusters and detailed sentiment modules
3. Phase 4 plan for abnormal-account monitoring redesign
