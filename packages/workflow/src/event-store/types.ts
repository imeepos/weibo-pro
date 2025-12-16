import { NodeEvent } from '../execution/events';

/**
 * 事件存储令牌（DI 注入用）
 */
export const EVENT_STORE = Symbol('EVENT_STORE');

/**
 * 运行状态
 */
export interface RunState {
    runId: string;
    successNodeIds: Set<string>;
    failedNodeIds: Set<string>;
    runningNodeIds: Set<string>;
}

/**
 * 事件存储接口
 *
 * 设计原则：
 * - 前后端共用接口，不同实现
 * - 前端：LocalStorageEventStore
 * - 后端：DatabaseEventStore
 * - 测试：MemoryEventStore
 */
export interface IEventStore {
    /**
     * 追加事件
     */
    append(runId: string, event: NodeEvent): Promise<void>;

    /**
     * 获取所有事件（回放用）
     */
    getEvents(runId: string): Promise<NodeEvent[]>;

    /**
     * 获取成功节点 ID（续跑用）
     */
    getSuccessNodeIds(runId: string): Promise<Set<string>>;

    /**
     * 获取运行状态快照
     */
    getRunState(runId: string): Promise<RunState>;

    /**
     * 清除事件
     */
    clear(runId: string): Promise<void>;
}
