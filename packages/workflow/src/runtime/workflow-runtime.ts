import { WorkflowEventStream } from '../event-store/event-stream';
import { WorkflowGraphAst } from '../ast';
import { generateId } from '../utils';

/**
 * 工作流运行时状态管理器
 *
 * 设计哲学：
 * - 存在即合理：WorkflowGraphAst 是纯数据模型，运行时状态应分离管理
 * - 优雅即简约：统一管理所有运行时状态，避免污染数据模型
 * - 自动清理：使用 WeakMap 自动回收不再使用的运行时状态
 */
export class WorkflowRuntime {
    /** 工作流实例 → runId 映射 */
    private workflowToRunId = new WeakMap<WorkflowGraphAst, string>();

    /** runId → eventStream 映射 */
    private eventStreams = new Map<string, WorkflowEventStream>();

    /**
     * 为工作流创建运行时状态
     *
     * @param workflow 工作流实例
     * @returns runId
     */
    createRun(workflow: WorkflowGraphAst): string {
        // 如果已存在 runId，复用（支持续跑）
        const existingRunId = this.workflowToRunId.get(workflow);
        if (existingRunId) {
            return existingRunId;
        }

        // 生成新 runId
        const runId = this.generateRunId();
        this.workflowToRunId.set(workflow, runId);

        // 创建 eventStream
        const eventStream = new WorkflowEventStream();
        this.eventStreams.set(runId, eventStream);

        console.log(`[WorkflowRuntime] 创建运行实例 runId=${runId} for workflow ${workflow.id}`);

        return runId;
    }

    /**
     * 获取工作流的 runId
     */
    getRunId(workflow: WorkflowGraphAst): string | undefined {
        return this.workflowToRunId.get(workflow);
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
     */
    clearRun(runId: string): void {
        this.eventStreams.delete(runId);
        console.log(`[WorkflowRuntime] 清理运行实例 runId=${runId}`);
    }

    /**
     * 获取所有活跃的 runId
     */
    getActiveRunIds(): string[] {
        return Array.from(this.eventStreams.keys());
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
 */
export const globalRuntime = new WorkflowRuntime();
