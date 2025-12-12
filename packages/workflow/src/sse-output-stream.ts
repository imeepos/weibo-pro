import { Observable, merge } from 'rxjs';
import { map, filter, takeUntil, share } from 'rxjs/operators';
import { root } from '@sker/core';
import { INode } from './types';
import { WorkflowEventBus, WorkflowEventType, OutputEmitPayload } from './execution/workflow-events';

/**
 * SSE 消息类型 - 联合类型
 */
export type SseMessage = NodeStateMessage | OutputEmitMessage;

export interface OutputEmitMessage {
    type: 'output_emit';
    nodeId: string;
    property: string;
    value: any;
}

export interface NodeStateMessage {
    type: 'node_state';
    nodeId: string;
    data: INode;
}

/**
 * 包装 executeAst 的结果，监听 WorkflowEventBus 的 OUTPUT_EMIT 事件
 *
 * 设计思路：
 * - 节点状态更新：来自 execution$ 流（node_state 消息）
 * - 输出发射：来自 WorkflowEventBus 的 OUTPUT_EMIT 事件（output_emit 消息）
 *
 * OUTPUT_EMIT 事件在 ReactiveScheduler.createBehaviorSubjectStream 中触发，
 * 确保只有当数据真正流向下游时才发射（LLM 调用完成后）
 *
 * @param execution$ 原始执行流
 * @returns 增强的 SSE 消息流
 */
export function wrapExecutionWithOutputEmit(execution$: Observable<INode>): Observable<SseMessage> {
    const eventBus = root.get(WorkflowEventBus);

    // 节点状态流：转换为 SSE 消息格式
    const nodeStates$ = execution$.pipe(
        map(node => ({
            type: 'node_state' as const,
            nodeId: node.id,
            data: node
        } as NodeStateMessage)),
        share() // 共享订阅，避免重复执行
    );

    // 输出发射流：监听 WorkflowEventBus 的 OUTPUT_EMIT 事件
    const outputEmits$ = eventBus.ofType<OutputEmitPayload>(WorkflowEventType.OUTPUT_EMIT).pipe(
        // 只在 execution$ 活跃期间监听
        takeUntil(execution$.pipe(filter(() => false))), // 当 execution$ 完成时停止
        map(event => ({
            type: 'output_emit' as const,
            nodeId: event.nodeId!,
            property: event.payload!.property,
            value: event.payload!.value
        } as OutputEmitMessage))
    );

    // 合并两个流
    return new Observable<SseMessage>(subscriber => {
        let completed = false;

        // 订阅输出发射流（eventBus 事件）
        const outputSub = outputEmits$.subscribe({
            next: (msg) => subscriber.next(msg),
            error: (err) => {
                // 输出流错误不应该终止整个 SSE 流
                console.error('[SSE] 输出发射流错误:', err);
            }
        });

        // 订阅节点状态流
        const stateSub = nodeStates$.subscribe({
            next: (msg) => subscriber.next(msg),
            error: (err) => {
                outputSub.unsubscribe();
                subscriber.error(err);
            },
            complete: () => {
                completed = true;
                // 延迟一点完成，确保最后的 OUTPUT_EMIT 事件能被处理
                setTimeout(() => {
                    outputSub.unsubscribe();
                    subscriber.complete();
                }, 100);
            }
        });

        return () => {
            stateSub.unsubscribe();
            outputSub.unsubscribe();
        };
    });
}

/**
 * 创建节点的 SSE 消息流（简化版本）
 *
 * @param nodeStream 节点执行流
 * @returns SSE 消息流
 */
export function createNodeSseStream(nodeStream: Observable<INode>): Observable<SseMessage> {
    return wrapExecutionWithOutputEmit(nodeStream);
}
