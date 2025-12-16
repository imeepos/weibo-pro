import type { NodeEvent, IEventStore, RunState } from '@sker/workflow';

/**
 * LocalStorage 事件存储（浏览器环境）
 */
export class LocalStorageEventStore implements IEventStore {
    private key(runId: string): string {
        return `workflow_events_${runId}`;
    }

    async append(runId: string, event: NodeEvent): Promise<void> {
        const events = this.getEventsSync(runId);
        events.push(event);
        localStorage.setItem(this.key(runId), JSON.stringify(events));
    }

    async getEvents(runId: string): Promise<NodeEvent[]> {
        return this.getEventsSync(runId);
    }

    async getSuccessNodeIds(runId: string): Promise<Set<string>> {
        const events = this.getEventsSync(runId);
        return new Set(
            events
                .filter(e => e.type === 'node_success' && e.id)
                .map(e => e.id!)
        );
    }

    async getRunState(runId: string): Promise<RunState> {
        const events = this.getEventsSync(runId);
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
        localStorage.removeItem(this.key(runId));
    }

    private getEventsSync(runId: string): NodeEvent[] {
        const data = localStorage.getItem(this.key(runId));
        return data ? JSON.parse(data) : [];
    }
}
