import { WorkflowEventStream } from '../event-store/event-stream';

/**
 * 工作流运行时管理器
 *
 * 设计哲学（重构后）：
 * - **存在即合理**：单一 EventStream 实例，消除复杂的 runId 查找
 * - **优雅即简约**：startRecording/stopRecording 明确生命周期
 * - **业界最佳实践**：借鉴 Redux DevTools 和 Chrome DevTools 设计
 */
export class WorkflowRuntime {
    /** 全局事件流（单例） */
    private eventStream = new WorkflowEventStream();

    /**
     * 获取全局事件流
     */
    get events(): WorkflowEventStream {
        return this.eventStream;
    }

    /**
     * 开始录制事件
     *
     * 语义：清空历史事件，开启事件存储
     * 用途：工作流执行前调用
     */
    startRecording(): void {
        this.eventStream.clear();
        this.eventStream.setStoreEnabled(true);
    }

    /**
     * 停止录制事件
     *
     * 语义：关闭事件存储，保留已有事件
     * 用途：工作流执行完成后调用
     */
    stopRecording(): void {
        this.eventStream.setStoreEnabled(false);
    }

    /**
     * 清空所有事件
     */
    clearEvents(): void {
        this.eventStream.clear();
    }
}

/**
 * 全局运行时实例（单例）
 */
export let globalRuntime = new WorkflowRuntime();

/**
 * 设置全局运行时实例（测试/依赖注入用）
 */
export function setGlobalRuntime(runtime: WorkflowRuntime): void {
    globalRuntime = runtime;
}

