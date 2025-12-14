import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { WorkflowEvent } from './execution/network-builder';

/**
 * SSE 消息类型 - 直接使用 WorkflowEvent
 */
export type SseMessage = WorkflowEvent;

/**
 * 包装工作流事件流为 SSE 消息流
 *
 * 设计思路：
 * - 纯流式架构，无需 EventBus
 * - 事件流 = SSE 消息流（零转换）
 * - 利用 RxJS 的所有操作符能力
 *
 * @param events$ 工作流事件流
 * @returns SSE 消息流
 */
export function wrapExecutionWithOutputEmit(events$: Observable<WorkflowEvent>): Observable<SseMessage> {
    console.log('[SSE] 开始包装工作流事件流');

    return events$.pipe(
        map(event => {
            // 记录不同类型的事件
            switch (event.type) {
                case 'node_state':
                    console.log(`[SSE] 节点状态更新 节点=${event.nodeId} 状态=${event.data.state}`);
                    break;
                case 'output_emit':
                    console.log(`[SSE] 输出发射 节点=${event.nodeId} 属性=${event.property}`);
                    break;
                case 'workflow_complete':
                    console.log(`[SSE] 工作流执行完成`);
                    break;
                case 'workflow_error':
                    console.error(`[SSE] 工作流错误 节点=${event.nodeId}`, event.error);
                    break;
            }

            // 事件即消息，零转换
            return event as SseMessage;
        })
    );
}

/**
 * 创建节点的 SSE 消息流（简化版本）
 *
 * @param eventStream 工作流事件流
 * @returns SSE 消息流
 */
export function createNodeSseStream(eventStream: Observable<WorkflowEvent>): Observable<SseMessage> {
    return wrapExecutionWithOutputEmit(eventStream);
}
