import { NodeEvent } from '../execution/events';
import { IEventStore, RunState } from './types';

/**
 * 内存事件存储（测试/临时执行）
 */
export class MemoryEventStore implements IEventStore {
    private store = new Map<string, NodeEvent[]>();

    async append(runId: string, event: NodeEvent): Promise<void> {
        if (!this.store.has(runId)) {
            this.store.set(runId, []);
        }
        this.store.get(runId)!.push(event);
    }

    async getEvents(runId: string): Promise<NodeEvent[]> {
        return this.store.get(runId) ?? [];
    }

    async getSuccessNodeIds(runId: string): Promise<Set<string>> {
        const events = this.store.get(runId) ?? [];
        return new Set(
            events
                .filter(e => e.type === 'node_success' && e.id)
                .map(e => e.id!)
        );
    }

    async getRunState(runId: string): Promise<RunState> {
        const events = this.store.get(runId) ?? [];
        const nodeLastEvent = new Map<string, NodeEvent>();

        for (const event of events) {
            if (event.id && event.type !== 'node_emit') {
                nodeLastEvent.set(event.id, event);
            }
        }

        const successNodeIds = new Set<string>();
        const failedNodeIds = new Set<string>();
        const runningNodeIds = new Set<string>();

        for (const [nodeId, event] of nodeLastEvent) {
            switch (event.type) {
                case 'node_success':
                    successNodeIds.add(nodeId);
                    break;
                case 'node_fail':
                    failedNodeIds.add(nodeId);
                    break;
                case 'node_runing':
                    runningNodeIds.add(nodeId);
                    break;
            }
        }

        return { runId, successNodeIds, failedNodeIds, runningNodeIds };
    }

    async clear(runId: string): Promise<void> {
        this.store.delete(runId);
    }

    /** 清除所有数据（测试用） */
    clearAll(): void {
        this.store.clear();
    }
}

