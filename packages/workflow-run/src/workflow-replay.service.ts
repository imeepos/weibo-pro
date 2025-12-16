import { Injectable, Inject } from '@sker/core';
import { EntityManager } from 'typeorm';
import { WorkflowRunEntity, RunStatus } from '@sker/entities';
import { Observable, from, interval } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { NodeEvent, type IEventStore, EVENT_STORE, RunState, globalRuntime, WorkflowEventStream } from '@sker/workflow';
import { fromJson, WorkflowGraphAst, executeWorkflowImmediate } from '@sker/workflow';

/**
 * 工作流续跑和回放服务
 *
 * 设计哲学：
 * - 续跑：从失败节点重新执行，成功节点跳过
 * - 回放：按时间顺序重放事件流（调试/演示）
 * - 状态查询：从事件推导节点状态
 */
@Injectable()
export class WorkflowReplayService {
    constructor(
        private db: EntityManager,
        @Inject(EVENT_STORE) private eventStore: IEventStore
    ) {}

    /**
     * 续跑失败的工作流
     *
     * 流程：
     * 1. 从 EventStore 恢复事件到 WorkflowEventStream
     * 2. 创建运行时实例（runId + eventStream）
     * 3. 执行时自动跳过成功节点（VisitorExecutor 检测 eventStream.isNodeSuccess）
     */
    async resumeRun(runId: string): Promise<string> {
        const run = await this.db.findOne(WorkflowRunEntity, {
            where: { id: runId }
        });

        if (!run) {
            throw new Error(`运行记录不存在: ${runId}`);
        }

        if (run.status !== RunStatus.FAILED) {
            throw new Error('只能恢复失败的运行');
        }

        // 1. 恢复工作流
        const workflow = fromJson<WorkflowGraphAst>(run.graphSnapshot);

        // 2. 从 EventStore 恢复事件到 WorkflowEventStream
        const events = await this.eventStore.getEvents(runId);
        const eventStream = WorkflowEventStream.fromJSON({ events });

        // 3. 创建运行时实例
        const newRunId = await globalRuntime.createRun(workflow);
        globalRuntime.setEventStream(newRunId, eventStream);

        console.log(`[WorkflowReplayService] 续跑工作流: ${workflow.id}, newRunId: ${newRunId}, 恢复 ${events.length} 个事件`);

        // 4. 创建新 run 记录
        const newRun = this.db.create(WorkflowRunEntity, {
            id: newRunId,
            workflowId: run.workflowId,
            scheduleId: run.scheduleId,
            status: RunStatus.RUNNING,
            graphSnapshot: run.graphSnapshot,
            inputs: run.inputs,
            nodeStates: {},
            startedAt: new Date(),
        });
        await this.db.save(newRun);

        // 5. 执行（成功节点会从 eventStream 中重放，自动跳过）
        await executeWorkflowImmediate(workflow, run.inputs as any);

        return newRunId;
    }

    /**
     * 回放工作流执行事件
     *
     * @param runId 运行 ID
     * @param speed 回放速度（毫秒/事件）
     */
    replayRun(runId: string, speed = 100): Observable<NodeEvent> {
        return from(this.eventStore.getEvents(runId)).pipe(
            concatMap(events =>
                from(events).pipe(
                    concatMap((event, index) =>
                        interval(speed).pipe(
                            map(() => event)
                        ).pipe(
                            // 只取第一个值
                            concatMap(e => index === 0 ? [e] : interval(speed).pipe(map(() => e)))
                        )
                    )
                )
            )
        );
    }

    /**
     * 获取运行状态快照
     */
    async getRunState(runId: string): Promise<RunState> {
        return this.eventStore.getRunState(runId);
    }

    /**
     * 清除运行事件
     */
    async clearRunEvents(runId: string): Promise<void> {
        await this.eventStore.clear(runId);
    }
}
