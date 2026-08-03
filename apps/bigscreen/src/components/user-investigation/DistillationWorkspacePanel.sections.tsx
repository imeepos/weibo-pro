import type { PersonaEvidenceItem, PersonaListItem, PersonaMemoryGraph } from '@sker/sdk';
import type { DistillationTaskSummary } from '@sker/sdk';
import { Button } from '@sker/ui/components/ui/button';
import MemoryGraph from '@/components/charts/MemoryGraph';

interface SelectedUserCardProps {
  selectedUserId: string | null;
}

export function SelectedUserCard({ selectedUserId }: SelectedUserCardProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">当前选中用户</div>
      <div className="mt-1 font-medium text-foreground">{selectedUserId ?? '尚未选择'}</div>
    </div>
  );
}

interface TaskStatusCardProps {
  activeTask: DistillationTaskSummary | null;
  taskForSummary: DistillationTaskSummary | null;
  isTaskLoading: boolean;
  isTaskRefreshing: boolean;
  stageLabel: string;
  coverageLabel: string | null;
  extractionProgressLabel: string | null;
  activeTaskProgressLabel: string | null;
  progressCountersLabel: string | null;
  partialHint: string | null;
}

export function TaskStatusCard({
  activeTask,
  taskForSummary,
  isTaskLoading,
  isTaskRefreshing,
  stageLabel,
  coverageLabel,
  extractionProgressLabel,
  activeTaskProgressLabel,
  progressCountersLabel,
  partialHint,
}: TaskStatusCardProps) {
  const progress = taskForSummary?.progress ?? null;

  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{activeTask ? '当前任务' : '最新任务'}</div>
      <div className="mt-1 text-sm text-foreground">
        {taskForSummary ? `${taskForSummary.status} · ${taskForSummary.historyWindowDays} 天` : '暂无蒸馏任务'}
      </div>
      {isTaskLoading && (
        <div className="mt-2 text-xs text-muted-foreground">正在加载蒸馏任务状态...</div>
      )}
      {isTaskRefreshing && (
        <div className="mt-2 text-xs text-muted-foreground">后台刷新中...</div>
      )}
      {taskForSummary && (
        <div className="mt-2 text-xs text-muted-foreground">阶段：{stageLabel}</div>
      )}
      {coverageLabel && (
        <div className="mt-2 text-xs text-muted-foreground">{coverageLabel}</div>
      )}
      {extractionProgressLabel && (
        <div className="mt-2 text-xs text-muted-foreground">{extractionProgressLabel}</div>
      )}
      {activeTaskProgressLabel && (
        <div className="mt-2 text-xs text-muted-foreground">{activeTaskProgressLabel}</div>
      )}
      {progressCountersLabel && (
        <div className="mt-2 text-xs text-muted-foreground">{progressCountersLabel}</div>
      )}
      {partialHint && (
        <div className="mt-2 text-xs text-amber-700">{partialHint}</div>
      )}
      {taskForSummary?.distilledSummary && (
        <div className="mt-2 text-sm text-muted-foreground">{taskForSummary.distilledSummary}</div>
      )}
      {taskForSummary?.errorMessage && (
        <div className="mt-2 text-sm text-destructive">{taskForSummary.errorMessage}</div>
      )}
      {progress?.recentWarnings?.length ? (
        <div className="mt-3 rounded-md border border-amber-300/40 bg-amber-50 p-2 text-xs text-amber-800">
          {progress.recentWarnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ProgressHintCardProps {
  progressHint: string | null;
}

export function ProgressHintCard({ progressHint }: ProgressHintCardProps) {
  if (!progressHint) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
      {progressHint}
    </div>
  );
}

interface ActionButtonsProps {
  createButtonLabel: string;
  isCreateDisabled: boolean;
  latestTask: DistillationTaskSummary | null;
  onCreateTask: () => void;
  onReviewTask: (taskId: string, decision: 'approve' | 'reject') => void;
  onOpenGraphMode: () => void;
}

export function ActionButtons({
  createButtonLabel,
  isCreateDisabled,
  latestTask,
  onCreateTask,
  onReviewTask,
  onOpenGraphMode,
}: ActionButtonsProps) {
  return (
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
  );
}

interface PersonaSummaryCardProps {
  personaSummary: PersonaListItem | null;
  evidenceCount: number;
  evidenceItems: PersonaEvidenceItem[];
  onSelectEvidence: (item: PersonaEvidenceItem) => void;
}

export function PersonaSummaryCard({
  personaSummary,
  evidenceCount,
  evidenceItems,
  onSelectEvidence,
}: PersonaSummaryCardProps) {
  return (
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
                  onClick={() => onSelectEvidence(item)}
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
  );
}

interface EvidenceDetailCardProps {
  selectedEvidence: PersonaEvidenceItem | null;
}

export function EvidenceDetailCard({ selectedEvidence }: EvidenceDetailCardProps) {
  if (!selectedEvidence) return null;

  return (
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
  );
}

interface GraphPreviewCardProps {
  memoryGraph: PersonaMemoryGraph | null;
  isTaskActive: boolean;
}

export function GraphPreviewCard({ memoryGraph, isTaskActive }: GraphPreviewCardProps) {
  return (
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
      ) : isTaskActive ? (
        <div className="mt-2 text-sm text-muted-foreground">
          当前图谱仍在生成中，蒸馏完成后会展示知识树预览
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">当前用户尚未生成单用户图谱预览</div>
      )}
    </div>
  );
}

interface TaskHistoryCardProps {
  tasks: DistillationTaskSummary[];
}

export function TaskHistoryCard({ tasks }: TaskHistoryCardProps) {
  return (
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
  );
}
