/**
 * 节点事件类型，工作流也是一个节点
 */
export type NodeEvent<T = any> =
    | NodeRuningEvent
    | NodeEmitEvent<T>
    | NodeSuccessEvent
    | NodeFailEvent
    | NodeDeltaEvent;

// 节点运行
export interface NodeRuningEvent {
    type: 'node_runing';
    id: string;
}
// 节点发射
export interface NodeEmitEvent<T = any> {
    type: 'node_emit';
    id: string;
    data: Partial<T>;
}
// 节点成功
export interface NodeSuccessEvent<T = any> {
    type: 'node_success';
    id: string;
}
// 节点失败
export interface NodeFailEvent {
    type: 'node_fail';
    id: string;
    error: string | undefined;
}
// 节点增量输出（流式）
export interface NodeDeltaEvent {
    type: 'node_delta';
    id: string;
    data: {
        delta: string;
        accumulated?: string;
        [key: string]: any;
    };
}
