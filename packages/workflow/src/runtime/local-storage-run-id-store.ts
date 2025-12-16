import type { IRunIdStore } from './run-id-store';

/**
 * LocalStorage RunId 存储（浏览器环境）
 *
 * 设计哲学：
 * - 存储格式：{ [workflowId]: runId }
 * - 单键存储：所有映射存在同一个 key 下（减少碎片）
 * - 即时持久化：每次修改立即写入
 */
export class LocalStorageRunIdStore implements IRunIdStore {
    private readonly STORAGE_KEY = 'workflow_run_id_mappings';

    async set(workflowId: string, runId: string): Promise<void> {
        const mappings = this.getMappingsSync();
        mappings[workflowId] = runId;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappings));
    }

    async get(workflowId: string): Promise<string | undefined> {
        const mappings = this.getMappingsSync();
        return mappings[workflowId];
    }

    async delete(workflowId: string): Promise<void> {
        const mappings = this.getMappingsSync();
        delete mappings[workflowId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mappings));
    }

    async getAll(): Promise<Map<string, string>> {
        const mappings = this.getMappingsSync();
        return new Map(Object.entries(mappings));
    }

    async clear(): Promise<void> {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    private getMappingsSync(): Record<string, string> {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }
}
