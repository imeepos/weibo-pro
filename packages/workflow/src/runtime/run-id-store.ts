/**
 * RunId 持久化存储接口
 *
 * 设计哲学：
 * - 跨平台抽象：浏览器用 LocalStorage，后端用数据库/Redis
 * - 轻量级：只存储 workflowId → runId 映射
 * - 自动清理：支持过期策略
 */
export interface IRunIdStore {
    /**
     * 保存工作流 → runId 映射
     */
    set(workflowId: string, runId: string): Promise<void>;

    /**
     * 获取工作流的 runId
     */
    get(workflowId: string): Promise<string | undefined>;

    /**
     * 删除映射
     */
    delete(workflowId: string): Promise<void>;

    /**
     * 获取所有映射
     */
    getAll(): Promise<Map<string, string>>;

    /**
     * 清空所有映射
     */
    clear(): Promise<void>;
}

/**
 * RunId 存储的 DI Token
 */
export const RUN_ID_STORE = Symbol('RUN_ID_STORE');
