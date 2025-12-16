import type { IRunIdStore } from './run-id-store';

/**
 * 内存 RunId 存储（默认/测试环境）
 *
 * 设计哲学：
 * - 零依赖：不依赖外部存储
 * - 快速：纯内存操作
 * - 易测试：进程隔离
 */
export class MemoryRunIdStore implements IRunIdStore {
    private mappings = new Map<string, string>();

    async set(workflowId: string, runId: string): Promise<void> {
        this.mappings.set(workflowId, runId);
    }

    async get(workflowId: string): Promise<string | undefined> {
        return this.mappings.get(workflowId);
    }

    async delete(workflowId: string): Promise<void> {
        this.mappings.delete(workflowId);
    }

    async getAll(): Promise<Map<string, string>> {
        return new Map(this.mappings);
    }

    async clear(): Promise<void> {
        this.mappings.clear();
    }
}
