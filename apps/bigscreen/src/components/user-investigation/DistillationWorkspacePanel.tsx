import type { PersonaListItem } from '@sker/sdk';
import { Button } from '@sker/ui/components/ui/button';
import type { DistillationTaskSummary } from '@sker/sdk';

interface DistillationWorkspacePanelProps {
  selectedUserId: string | null;
  tasks: DistillationTaskSummary[];
  personaSummary: PersonaListItem | null;
  evidenceCount: number;
  onCreateTask: () => void;
  onReviewTask: (taskId: string, decision: 'approve' | 'reject') => void;
  onOpenGraphMode: () => void;
}

export function DistillationWorkspacePanel({
  selectedUserId,
  tasks,
  personaSummary,
  evidenceCount,
  onCreateTask,
  onReviewTask,
  onOpenGraphMode,
}: DistillationWorkspacePanelProps) {
  const latestTask = tasks[0] ?? null;

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
          <div className="text-xs text-muted-foreground">最新任务</div>
          <div className="mt-1 text-sm text-foreground">
            {latestTask ? `${latestTask.status} · ${latestTask.historyWindowDays} 天` : '暂无蒸馏任务'}
          </div>
          {latestTask?.distilledSummary && (
            <div className="mt-2 text-sm text-muted-foreground">{latestTask.distilledSummary}</div>
          )}
          {latestTask?.errorMessage && (
            <div className="mt-2 text-sm text-destructive">{latestTask.errorMessage}</div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onCreateTask} disabled={!selectedUserId}>
            发起蒸馏
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
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">当前用户尚未发布 Persona</div>
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
