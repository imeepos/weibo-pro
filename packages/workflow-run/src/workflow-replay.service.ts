import { Injectable, Inject } from '@sker/core';
import { WorkflowRunEntity, RunStatus, useEntityManager } from '@sker/entities';
import { Observable, from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { NodeEvent, type IEventStore, EVENT_STORE, RunState, globalRuntime, fromJson, WorkflowGraphAst, executeWorkflowImmediate } from '@sker/workflow';
import { logger } from '@sker/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * 工作流续跑和回放服务
 *
 * 设计哲学：
 * - 续跑：从失败节点重新执行，成功节点跳过
 * - 回放：按时间顺序重放事件流（调试/演示）
 * - 状态查询：从事件推导节点状态
 *
 * 存在即合理：
 * - 续跑功能允许失败工作流从断点恢复
 * - 回放功能支持调试和演示
 * - 状态查询支持运行历史分析
 */
@Injectable()
export class WorkflowReplayService {
    constructor(
        @Inject(EVENT_STORE) private eventStore: IEventStore
    ) {}

    /**
     * 续跑失败的工作流
     *
     * 流程：
     * 1. 从数据库加载运行记录
     * 2. 恢复工作流 AST
     * 3. 恢复事件到全局 EventStream
     * 4. 创建新的运行记录
     * 5. 执行工作流（成功节点会被自动跳过）
     *
     * @param runId 原运行 ID
     * @returns 新运行 ID
     */
    async resumeRun(runId: string): Promise<string> {
        return useEntityManager(async (db) => {
            const run = await db.findOne(WorkflowRunEntity, {
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

            // 2. 从 EventStore 恢复事件到全局 EventStream
            const events = await this.eventStore.getEvents(runId);

            // 3. 恢复事件到全局 Runtime
            globalRuntime.clearEvents();
            globalRuntime.events.restore(events);

            logger.info('[WorkflowReplayService] 续跑工作流', {
                workflowId: workflow.id,
                oldRunId: runId,
                restoredEvents: events.length
            });

            // 4. 创建新 run 记录
            const newRunId = uuidv4();
            const newRun = db.create(WorkflowRunEntity, {
                id: newRunId,
                workflowId: run.workflowId,
                scheduleId: run.scheduleId,
                status: RunStatus.RUNNING,
                graphSnapshot: run.graphSnapshot,
                inputs: run.inputs,
                nodeStates: {},
                startedAt: new Date(),
            });
            await db.save(newRun);

            // 5. 开始录制并执行
            globalRuntime.startRecording();

            try {
                // 执行工作流（VisitorExecutor 会检查 globalRuntime.events.isNodeSuccess 来跳过成功节点）
                await executeWorkflowImmediate(workflow, run.inputs as Record<string, unknown>);
            } finally {
                globalRuntime.stopRecording();

                // 6. 保存新事件到 EventStore
                const newEvents = globalRuntime.events.events;
                await this.eventStore.saveEvents(newRunId, newEvents);

                // 7. 更新运行状态
                const finalRun = await db.findOne(WorkflowRunEntity, { where: { id: newRunId } });
                if (finalRun) {
                    // 检查是否有失败节点
                    const hasFailure = newEvents.some(e => e.type === 'node_fail');
                    finalRun.status = hasFailure ? RunStatus.FAILED : RunStatus.SUCCESS;
                    finalRun.finishedAt = new Date();
                    await db.save(finalRun);
                }
            }

            logger.info('[WorkflowReplayService] 续跑完成', {
                newRunId,
                totalEvents: newEvents.length
            });

            return newRunId;
        });
    }

    /**
     * 回放工作流执行事件
     *
     * @param runId 运行 ID
     * @param speed 回放速度（毫秒/事件）
     */
    replayRun(runId: string, speed = 100): Observable<NodeEvent> {
        return from(this.eventStore.getEvents(runId)).pipe(
            concatMap(events => {
                // 使用 WorkflowEventStream 的 autoReplay$ 功能
                const stream = globalRuntime.events;
                stream.restore(events);
                return stream.autoReplay$(speed);
            })
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

    /**
     * 获取运行的所有事件
     */
    async getRunEvents(runId: string): Promise<NodeEvent[]> {
        return this.eventStore.getEvents(runId);
    }

    /**
     * 获取失败的节点 ID 列表
     */
    async getFailedNodes(runId: string): Promise<string[]> {
        const events = await this.eventStore.getEvents(runId);
        const successNodeIds = new Set<string>();
        const failedNodeIds = new Set<string>();

        for (const e of events) {
            if (!e.id) continue;
            if (e.type === 'node_success') {
                successNodeIds.add(e.id);
                failedNodeIds.delete(e.id);
            } else if (e.type === 'node_fail' && !successNodeIds.has(e.id)) {
                failedNodeIds.add(e.id);
            }
        }

        return Array.from(failedNodeIds);
    }
}
