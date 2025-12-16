import { WorkflowEventStream } from '../event-store/event-stream';
import { WorkflowGraphAst } from '../ast';
import { generateId } from '../utils';
import type { IRunIdStore } from './run-id-store';
import { MemoryRunIdStore } from './memory-run-id-store';

/**
 * 工作流运行时状态管理器
 *
 * 设计哲学：
 * - 存在即合理：WorkflowGraphAst 是纯数据模型，运行时状态应分离管理
 * - 优雅即简约：统一管理所有运行时状态，避免污染数据模型
 * - 自动清理：使用 WeakMap 自动回收不再使用的运行时状态
 * - 持久化：通过 IRunIdStore 支持跨会话恢复（浏览器/后端）
 */
export class WorkflowRuntime {
    /** 工作流实例 → runId 映射（内存快速查找） */
    private workflowToRunId = new WeakMap<WorkflowGraphAst, string>();

    /** workflowId → runId 映射（持久化查找） */
    private workflowIdToRunId = new Map<string, string>();

    /** runId → eventStream 映射 */
    private eventStreams = new Map<string, WorkflowEventStream>();

    /** RunId 持久化存储 */
    private runIdStore: IRunIdStore;

    constructor(runIdStore?: IRunIdStore) {
        this.runIdStore = runIdStore || new MemoryRunIdStore();
    }

    /**
     * 为工作流创建运行时状态
     *
     * @param workflow 工作流实例
     * @returns runId
     */
    async createRun(workflow: WorkflowGraphAst): Promise<string> {
        // 1. 检查 WeakMap 缓存
        const cachedRunId = this.workflowToRunId.get(workflow);
        if (cachedRunId) {
            return cachedRunId;
        }

        // 2. 检查持久化存储（工作流可能之前执行过）
        const persistedRunId = await this.runIdStore.get(workflow.id);
        if (persistedRunId) {
            console.log(`[WorkflowRuntime] 恢复已有运行实例 runId=${persistedRunId} for workflow ${workflow.id}`);
            this.workflowToRunId.set(workflow, persistedRunId);
            this.workflowIdToRunId.set(workflow.id, persistedRunId);

            // 确保 eventStream 存在
            if (!this.eventStreams.has(persistedRunId)) {
                this.eventStreams.set(persistedRunId, new WorkflowEventStream());
            }

            return persistedRunId;
        }

        // 3. 生成新 runId
        const runId = this.generateRunId();
        this.workflowToRunId.set(workflow, runId);
        this.workflowIdToRunId.set(workflow.id, runId);

        // 4. 创建 eventStream
        const eventStream = new WorkflowEventStream();
        this.eventStreams.set(runId, eventStream);

        // 5. 持久化映射
        await this.runIdStore.set(workflow.id, runId);

        console.log(`[WorkflowRuntime] 创建运行实例 runId=${runId} for workflow ${workflow.id}`);

        return runId;
    }

    /**
     * 获取工作流的 runId
     */
    getRunId(workflow: WorkflowGraphAst): string | undefined {
        // 优先从 WeakMap 查找
        const cachedRunId = this.workflowToRunId.get(workflow);
        if (cachedRunId) return cachedRunId;

        // 回退到 workflowId 查找
        return this.workflowIdToRunId.get(workflow.id);
    }

    /**
     * 通过 workflowId 获取 runId
     */
    async getRunIdByWorkflowId(workflowId: string): Promise<string | undefined> {
        // 优先从内存查找
        const cachedRunId = this.workflowIdToRunId.get(workflowId);
        if (cachedRunId) return cachedRunId;

        // 从持久化存储查找
        const persistedRunId = await this.runIdStore.get(workflowId);
        if (persistedRunId) {
            this.workflowIdToRunId.set(workflowId, persistedRunId);
        }
        return persistedRunId;
    }

    /**
     * 获取 eventStream
     */
    getEventStream(runId: string): WorkflowEventStream | undefined {
        return this.eventStreams.get(runId);
    }

    /**
     * 设置 eventStream（恢复续跑时使用）
     */
    setEventStream(runId: string, eventStream: WorkflowEventStream): void {
        this.eventStreams.set(runId, eventStream);
    }

    /**
     * 清理运行时状态
     *
     * @param runId 运行 ID
     * @param keepPersisted 是否保留持久化映射（默认 false）
     */
    async clearRun(runId: string, keepPersisted = false): Promise<void> {
        this.eventStreams.delete(runId);

        // 清理内存映射
        for (const [workflowId, rid] of this.workflowIdToRunId.entries()) {
            if (rid === runId) {
                this.workflowIdToRunId.delete(workflowId);

                // 清理持久化映射
                if (!keepPersisted) {
                    await this.runIdStore.delete(workflowId);
                }
                break;
            }
        }

        console.log(`[WorkflowRuntime] 清理运行实例 runId=${runId}, keepPersisted=${keepPersisted}`);
    }

    /**
     * 获取所有活跃的 runId
     */
    getActiveRunIds(): string[] {
        return Array.from(this.eventStreams.keys());
    }

    /**
     * 从持久化存储恢复所有映射（启动时调用）
     */
    async restoreFromStore(): Promise<void> {
        const mappings = await this.runIdStore.getAll();
        for (const [workflowId, runId] of mappings.entries()) {
            this.workflowIdToRunId.set(workflowId, runId);

            // 创建空 eventStream（实际事件从 IEventStore 恢复）
            if (!this.eventStreams.has(runId)) {
                this.eventStreams.set(runId, new WorkflowEventStream());
            }
        }
        console.log(`[WorkflowRuntime] 恢复 ${mappings.size} 个工作流映射`);
    }

    /**
     * 清空所有运行时状态和持久化数据
     */
    async clearAll(): Promise<void> {
        this.eventStreams.clear();
        this.workflowIdToRunId.clear();
        await this.runIdStore.clear();
        console.log(`[WorkflowRuntime] 清空所有运行时状态`);
    }

    /**
     * 生成运行 ID
     */
    private generateRunId(): string {
        return `run-${generateId()}`;
    }
}

/**
 * 全局运行时实例（单例）
 *
 * 设计决策：
 * - 使用单例模式确保所有执行共享同一个运行时状态管理器
 * - 前后端共用（浏览器和 Node.js 环境）
 * - 默认使用 MemoryRunIdStore（测试/开发环境）
 * - 生产环境应通过 setGlobalRuntime() 注入持久化存储
 */
export let globalRuntime = new WorkflowRuntime();

/**
 * 设置全局运行时实例（用于注入持久化存储）
 *
 * @example
 * // 浏览器端
 * setGlobalRuntime(new WorkflowRuntime(new LocalStorageRunIdStore()));
 *
 * // 后端
 * setGlobalRuntime(new WorkflowRuntime(new DatabaseRunIdStore(db)));
 */
export function setGlobalRuntime(runtime: WorkflowRuntime): void {
    globalRuntime = runtime;
}

