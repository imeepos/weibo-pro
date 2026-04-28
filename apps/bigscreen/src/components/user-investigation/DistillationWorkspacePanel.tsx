import type { PersonaEvidenceItem, PersonaListItem, PersonaMemoryGraph } from '@sker/sdk';
import { Button } from '@sker/ui/components/ui/button';
import type { DistillationTaskSummary } from '@sker/sdk';
import React, { useState } from 'react';
import MemoryGraph from '@/components/charts/MemoryGraph';

const ACTIVE_DISTILLATION_TASK_STATUSES = new Set(['queued', 'crawling', 'analyzing']);

function formatProgressTime(value: string | null | undefined): string {
  if (!value) {
    return '刚刚';
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return value;
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (diffMinutes < 1) {
    return '刚刚';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

interface DistillationWorkspacePanelProps {
  selectedUserId: string | null;
  tasks: DistillationTaskSummary[];
  personaSummary: PersonaListItem | null;
  evidenceCount: number;
  evidenceItems: PersonaEvidenceItem[];
  memoryGraph: PersonaMemoryGraph | null;
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
  const activeTaskProgressLabel = isTaskActive && taskForSummary
    ? `已抓取帖子 ${taskForSummary.sourcePostCount} 条 · 最近进展 ${formatProgressTime(taskForSummary.updatedAt)}`
    : null;
  const progressHint = isCreatingTask && !isTaskActive
    ? '蒸馏任务已提交，正在进入后台队列，请稍候'
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
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">当前选中用户</div>
          <div className="mt-1 font-medium text-foreground">{selectedUserId ?? '尚未选择'}</div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">{activeTask ? '当前任务' : '最新任务'}</div>
          <div className="mt-1 text-sm text-foreground">
            {taskForSummary ? `${taskForSummary.status} · ${taskForSummary.historyWindowDays} 天` : '暂无蒸馏任务'}
          </div>
          {activeTaskProgressLabel && (
            <div className="mt-2 text-xs text-muted-foreground">{activeTaskProgressLabel}</div>
          )}
          {taskForSummary?.distilledSummary && (
            <div className="mt-2 text-sm text-muted-foreground">{taskForSummary.distilledSummary}</div>
          )}
          {taskForSummary?.errorMessage && (
            <div className="mt-2 text-sm text-destructive">{taskForSummary.errorMessage}</div>
          )}
        </div>

        {progressHint && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
            {progressHint}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={onCreateTask} disabled={isCreateDisabled}>
            {createButtonLabel}
          </Button>
          <Button variant="outline" onClick={onOpenGraphMode}>
            查看全量图谱
          </Button>
          {latestTask?.reviewStatus === 'human_pending' && (
            <>
              <Button variant="secondary" onClick={() => onReviewTask(latestTask.id, 'approve')}>
                人工通过
              </Button>
              <Button variant="destructive" onClick={() => onReviewTask(latestTask.id, 'reject')}>
                人工拒绝
              </Button>
            </>
          )}
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Persona 摘要</div>
          {personaSummary ? (
            <div className="mt-2 space-y-1 text-sm">
              <div className="font-medium text-foreground">{personaSummary.name}</div>
              {personaSummary.description && (
                <div className="text-muted-foreground">{personaSummary.description}</div>
              )}
              <div className="text-xs text-muted-foreground">
                记忆 {personaSummary.memoryCount} 条
              </div>
              <div className="text-xs text-muted-foreground">
                证据 {evidenceCount} 条
              </div>
              {evidenceItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {evidenceItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedEvidence(item)}
                      className="block w-full rounded-md bg-muted/40 p-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
                    >
                      {item.excerpt ?? `${item.sourceTable}:${item.sourceId}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">当前用户尚未发布 Persona</div>
          )}
        </div>

        {selectedEvidence && (
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">证据明细</div>
            <div className="mt-2 space-y-2 text-sm">
              <div className="font-medium text-foreground">
                来源 {selectedEvidence.sourceTable} · {selectedEvidence.sourceId}
              </div>
              {selectedEvidence.excerpt && (
                <div className="text-muted-foreground">{selectedEvidence.excerpt}</div>
              )}
              <div className="text-xs text-muted-foreground">
                类型 {selectedEvidence.evidenceType} · 置信度 {selectedEvidence.score}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">图谱预览</div>
          {memoryGraph ? (
            <div className="mt-2 space-y-2 text-sm">
              <div className="text-muted-foreground">
                节点 {memoryGraph.memories.length} 个 · 关系 {memoryGraph.relations.length} 条
              </div>
              <div className="h-64 overflow-hidden rounded-lg border bg-background">
                <MemoryGraph data={memoryGraph} className="h-full w-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                {memoryGraph.memories.slice(0, 3).map((memory) => (
                  <span
                    key={memory.id}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground"
                  >
                    {memory.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">当前用户尚未生成单用户图谱预览</div>
          )}
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">任务历史</div>
          {tasks.length > 0 ? (
            <div className="mt-2 space-y-2">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="rounded-md bg-muted/40 p-2 text-xs">
                  <div className="font-medium text-foreground">
                    {task.status} · {task.historyWindowDays} 天
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    样本 帖子 {task.sourcePostCount} / 评论 {task.sourceCommentCount} / 转发 {task.sourceRepostCount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">暂无历史任务</div>
          )}
        </div>
      </div>
    </section>
  );
}
