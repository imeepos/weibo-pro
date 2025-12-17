import { Injectable, Inject } from '@sker/core';
import { EntityManager } from 'typeorm';
import { WorkflowRunLogEntity, NodeEventType } from '@sker/entities';
import type { IEventStore, RunState } from '@sker/workflow';
import type { NodeEvent } from '@sker/workflow';

/**
 * 数据库事件存储（后端）
 */
@Injectable()
export class DatabaseEventStore implements IEventStore {
    constructor(@Inject(EntityManager) private db: EntityManager) {}

    async append(runId: string, event: NodeEvent): Promise<void> {
        const numericRunId = Number(runId);
        if (!Number.isFinite(numericRunId)) {
            console.warn(`[DatabaseEventStore] 跳过无效 runId: ${runId}`);
            return;
        }
        await this.db.insert(WorkflowRunLogEntity, {
            runId: numericRunId,
            nodeId: event.id ?? '',
            eventType: this.toEventType(event.type),
            property: undefined,
            data: event.type === 'node_emit' ? (event as { data?: Record<string, unknown> }).data : undefined,
        });
    }

    async getEvents(runId: string): Promise<NodeEvent[]> {
        const logs = await this.db.find(WorkflowRunLogEntity, {
            where: { runId: Number(runId) },
            order: { id: 'ASC' },
        });
        return logs.map(log => this.toNodeEvent(log));
    }

    async getSuccessNodeIds(runId: string): Promise<Set<string>> {
        const logs = await this.db.find(WorkflowRunLogEntity, {
            where: { runId: Number(runId), eventType: NodeEventType.SUCCESS },
            select: ['nodeId'],
        });
        return new Set(logs.map(l => l.nodeId));
    }

    async getRunState(runId: string): Promise<RunState> {
        const logs = await this.db.find(WorkflowRunLogEntity, {
            where: { runId: Number(runId) },
            order: { id: 'ASC' },
        });

        const nodeLastEvent = new Map<string, WorkflowRunLogEntity>();
        for (const log of logs) {
            if (log.nodeId && log.eventType !== NodeEventType.EMIT) {
                nodeLastEvent.set(log.nodeId, log);
            }
        }

        const successNodeIds = new Set<string>();
        const failedNodeIds = new Set<string>();
        const runningNodeIds = new Set<string>();

        for (const [nodeId, log] of nodeLastEvent) {
            switch (log.eventType) {
                case NodeEventType.SUCCESS:
                    successNodeIds.add(nodeId);
                    break;
                case NodeEventType.FAIL:
                    failedNodeIds.add(nodeId);
                    break;
                case NodeEventType.RUNNING:
                    runningNodeIds.add(nodeId);
                    break;
            }
        }

        return { runId, successNodeIds, failedNodeIds, runningNodeIds };
    }

    async clear(runId: string): Promise<void> {
        await this.db.delete(WorkflowRunLogEntity, { runId: Number(runId) });
    }

    private toEventType(type: string): NodeEventType {
        const map: Record<string, NodeEventType> = {
            'node_runing': NodeEventType.RUNNING,
            'node_emit': NodeEventType.EMIT,
            'node_success': NodeEventType.SUCCESS,
            'node_fail': NodeEventType.FAIL,
        };
        return map[type] ?? NodeEventType.RUNNING;
    }

    private toNodeEvent(log: WorkflowRunLogEntity): NodeEvent {
        switch (log.eventType) {
            case NodeEventType.RUNNING:
                return { type: 'node_runing', id: log.nodeId };
            case NodeEventType.EMIT:
                return { type: 'node_emit', id: log.nodeId, data: (log.data ?? {}) as Record<string, unknown> };
            case NodeEventType.SUCCESS:
                return { type: 'node_success', id: log.nodeId };
            case NodeEventType.FAIL:
                return { type: 'node_fail', id: log.nodeId, error: log.data as string | undefined };
        }
    }
}
