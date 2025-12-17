/**
 * 节点事件类型，工作流也是一个节点
 */
export type NodeEvent =
    | NodeRuningEvent
    | NodeEmitEvent
    | NodeSuccessEvent
    | NodeFailEvent;

// 节点运行
export interface NodeRuningEvent {
    type: 'node_runing';
    id: string;
}
// 节点发射
export interface NodeEmitEvent {
    type: 'node_emit';
    id: string;
    property: string;
    value: any;
}
// 节点成功
export interface NodeSuccessEvent {
    type: 'node_success';
    id: string;
}
// 节点失败
export interface NodeFailEvent {
    type: 'node_fail';
    id: string;
    error: string | undefined;
}
