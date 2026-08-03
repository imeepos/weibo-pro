import type { PersonaEvidenceItem, PersonaListItem, PersonaMemoryGraph } from '@sker/sdk';
import type { DistillationTaskSummary } from '@sker/sdk';
import React, { useState } from 'react';
import {
  ACTIVE_DISTILLATION_TASK_STATUSES,
  formatProgressTime,
  formatCoverageTime,
  getStageLabel,
} from './DistillationWorkspacePanel.utils';
import {
  SelectedUserCard,
  TaskStatusCard,
  ProgressHintCard,
  ActionButtons,
  PersonaSummaryCard,
  EvidenceDetailCard,
  GraphPreviewCard,
  TaskHistoryCard,
} from './DistillationWorkspacePanel.sections';

interface DistillationWorkspacePanelProps {
  selectedUserId: string | null;
  tasks: DistillationTaskSummary[];
  personaSummary: PersonaListItem | null;
  evidenceCount: number;
  evidenceItems: PersonaEvidenceItem[];
  memoryGraph: PersonaMemoryGraph | null;
  isTaskLoading?: boolean;
  isTaskRefreshing?: boolean;
  isCreatingTask?: boolean;
  onCreateTask: () => void;
  onReviewTask: (taskId: string, decision: 'approve' | 'reject') => void;
  onOpenGraphMode: () => void;
}

export function DistillationWorkspacePanel({
  selectedUserId,
  tasks,
  personaSummary,
  evidenceCount,
  evidenceItems,
  memoryGraph,
  isTaskLoading = false,
  isTaskRefreshing = false,
  isCreatingTask = false,
  onCreateTask,
  onReviewTask,
  onOpenGraphMode,
}: DistillationWorkspacePanelProps) {
  const latestTask = tasks[0] ?? null;
  const activeTask =
    tasks.find((task) => ACTIVE_DISTILLATION_TASK_STATUSES.has(task.status)) ?? null;
  const taskForSummary = activeTask ?? latestTask;
  const isTaskActive = activeTask !== null;
  const isCreateDisabled = !selectedUserId || isCreatingTask || isTaskActive;
  const progress = taskForSummary?.progress ?? null;
  const stageLabel = getStageLabel(progress?.stage ?? taskForSummary?.status ?? null);
  const latestCoverage = formatCoverageTime(progress?.coverage.latestPostAt);
  const oldestCoverage = formatCoverageTime(progress?.coverage.oldestPostAt);
  const coverageLabel =
    latestCoverage || oldestCoverage
      ? `覆盖时间：${latestCoverage ?? '--'} 至 ${oldestCoverage ?? '--'}`
      : null;
  const processedExtractionCount = progress
    ? progress.counters.reusedExtractions +
      progress.counters.extractedPosts +
      progress.counters.failedPosts
    : 0;
  const extractionProgressLabel =
    progress &&
    taskForSummary &&
    taskForSummary.sourcePostCount > 0 &&
    ['extracting', 'aggregating', 'publishing'].includes(progress.stage)
      ? `已处理 ${Math.min(processedExtractionCount, taskForSummary.sourcePostCount)} / ${taskForSummary.sourcePostCount} 条帖子`
      : null;
  const partialHint = progress?.partial
    ? '当前任务包含部分失败，系统会继续后续蒸馏。'
    : null;
  const progressCountersLabel = progress
    ? `已抓取 ${progress.counters.crawledPosts} · 复用 ${progress.counters.reusedExtractions} · 新抽取 ${progress.counters.extractedPosts} · 失败 ${progress.counters.failedPosts}`
    : null;
  const activeTaskProgressLabel = isTaskActive && taskForSummary
    ? progress
      ? `${progress.latestMessage} · 最近进展 ${formatProgressTime(progress.lastProgressAt)}`
      : taskForSummary.status === 'queued'
        ? `任务已进入队列 · 最近进展 ${formatProgressTime(taskForSummary.updatedAt)}`
        : taskForSummary.status === 'analyzing'
          ? `已抓取帖子 ${taskForSummary.sourcePostCount} 条 · 正在生成画像 · 最近进展 ${formatProgressTime(taskForSummary.updatedAt)}`
          : `已抓取帖子 ${taskForSummary.sourcePostCount} 条 · 最近进展 ${formatProgressTime(taskForSummary.updatedAt)}`
    : null;
  const progressHint = isCreatingTask && !isTaskActive
    ? '蒸馏任务已提交，正在进入后台队列，请稍候'
    : isTaskActive && progress
      ? `${progress.latestMessage} · 最近进展 ${formatProgressTime(progress.lastProgressAt)}`
      : isTaskActive
        ? activeTaskProgressLabel ?? '任务进行中，后台正在抓取与蒸馏，请稍候刷新结果'
      : null;
  const createButtonLabel = isCreatingTask && !isTaskActive
    ? '提交蒸馏中...'
    : isTaskActive
      ? '蒸馏进行中...'
      : '发起蒸馏';
  const [selectedEvidence, setSelectedEvidence] = useState<PersonaEvidenceItem | null>(null);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">AI 蒸馏画像</h2>
        <p className="mt-1 text-sm text-muted-foreground">蒸馏任务状态、画像摘要与 Persona 图谱入口</p>
      </div>

      <div className="space-y-4">
        <SelectedUserCard selectedUserId={selectedUserId} />

        <TaskStatusCard
          activeTask={activeTask}
          taskForSummary={taskForSummary}
          isTaskLoading={isTaskLoading}
          isTaskRefreshing={isTaskRefreshing}
          stageLabel={stageLabel}
          coverageLabel={coverageLabel}
          extractionProgressLabel={extractionProgressLabel}
          activeTaskProgressLabel={activeTaskProgressLabel}
          progressCountersLabel={progressCountersLabel}
          partialHint={partialHint}
        />

        <ProgressHintCard progressHint={progressHint} />

        <ActionButtons
          createButtonLabel={createButtonLabel}
          isCreateDisabled={isCreateDisabled}
          latestTask={latestTask}
          onCreateTask={onCreateTask}
          onReviewTask={onReviewTask}
          onOpenGraphMode={onOpenGraphMode}
        />

        <PersonaSummaryCard
          personaSummary={personaSummary}
          evidenceCount={evidenceCount}
          evidenceItems={evidenceItems}
          onSelectEvidence={setSelectedEvidence}
        />

        <EvidenceDetailCard selectedEvidence={selectedEvidence} />

        <GraphPreviewCard memoryGraph={memoryGraph} isTaskActive={isTaskActive} />

        <TaskHistoryCard tasks={tasks} />
      </div>
    </section>
  );
}
