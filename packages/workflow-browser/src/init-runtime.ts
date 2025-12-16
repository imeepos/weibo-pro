import { WorkflowRuntime, setGlobalRuntime, LocalStorageRunIdStore } from '@sker/workflow';

/**
 * 初始化浏览器端工作流运行时
 *
 * 设计哲学：
 * - 在应用启动时调用一次
 * - 注入 LocalStorageRunIdStore 实现持久化
 * - 自动恢复之前的 runId 映射
 */
export async function initBrowserWorkflowRuntime(): Promise<void> {
    const runIdStore = new LocalStorageRunIdStore();
    const runtime = new WorkflowRuntime(runIdStore);

    // 恢复持久化映射
    await runtime.restoreFromStore();

    // 设置为全局运行时
    setGlobalRuntime(runtime);

    console.log('[initBrowserWorkflowRuntime] 浏览器端工作流运行时初始化完成');
}
