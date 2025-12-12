import { BehaviorSubject, Observable, merge, EMPTY } from 'rxjs';
import { map, filter, skip } from 'rxjs/operators';
import { INode } from './types';

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
 * 创建节点的 SSE 消息流
 *
 * 将节点的状态更新和 BehaviorSubject 发射合并为统一的 SSE 消息流
 *
 * @param nodeStream 节点执行流（来自 executeAst）
 * @returns SSE 消息流
 */
export function createNodeSseStream(nodeStream: Observable<INode>): Observable<SseMessage> {
    let currentNode: INode | null = null;
    let outputSubscriptions: Observable<OutputEmitMessage>[] = [];

    return new Observable<SseMessage>(subscriber => {
        const subscription = nodeStream.subscribe({
            next: (node) => {
                // 发送节点状态更新
                subscriber.next({
                    type: 'node_state',
                    nodeId: node.id,
                    data: node
                });

                // 如果节点变化，重新订阅 BehaviorSubject
                if (currentNode?.id !== node.id) {
                    currentNode = node;
                    subscribeToOutputs(node);
                }
            },
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete()
        });

        function subscribeToOutputs(node: INode) {
            const outputs = node.metadata?.outputs || [];

            outputs.forEach(output => {
                const prop = output.property;
                const value = (node as any)[prop];

                if (value instanceof BehaviorSubject) {
                    // 跳过初始值，只监听后续发射
                    const outputStream = value.asObservable().pipe(
                        skip(1),
                        filter(v => v !== undefined),
                        map(v => ({
                            type: 'output_emit' as const,
                            nodeId: node.id,
                            property: prop,
                            value: v
                        }))
                    );

                    outputStream.subscribe(msg => subscriber.next(msg));
                }
            });
        }

        return () => subscription.unsubscribe();
    });
}

/**
 * 包装 executeAst 的结果，添加 BehaviorSubject 发射监听
 *
 * @param execution$ 原始执行流
 * @returns 增强的 SSE 消息流
 */
export function wrapExecutionWithOutputEmit(execution$: Observable<INode>): Observable<SseMessage> {
    const outputEmitters = new Map<string, Observable<OutputEmitMessage>>();
    const nodeStates$ = execution$.pipe(
        map(node => {
            // 为新节点创建输出监听
            if (!outputEmitters.has(node.id)) {
                const outputs$ = createOutputEmitStream(node);
                if (outputs$) {
                    outputEmitters.set(node.id, outputs$);
                }
            }

            return {
                type: 'node_state' as const,
                nodeId: node.id,
                data: node
            } as NodeStateMessage;
        })
    );

    // 动态合并所有输出流
    return new Observable<SseMessage>(subscriber => {
        const activeOutputSubs: { unsubscribe: () => void }[] = [];

        const stateSub = nodeStates$.subscribe({
            next: (msg) => {
                subscriber.next(msg);

                // 订阅该节点的输出流（如果有）
                const outputs$ = outputEmitters.get(msg.nodeId);
                if (outputs$) {
                    const sub = outputs$.subscribe(outputMsg => {
                        subscriber.next(outputMsg);
                    });
                    activeOutputSubs.push(sub);
                    outputEmitters.delete(msg.nodeId); // 防止重复订阅
                }
            },
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete()
        });

        return () => {
            stateSub.unsubscribe();
            activeOutputSubs.forEach(sub => sub.unsubscribe());
        };
    });
}

/**
 * 为节点创建 BehaviorSubject 输出发射流
 */
function createOutputEmitStream(node: INode): Observable<OutputEmitMessage> | null {
    const outputs = node.metadata?.outputs || [];
    const streams: Observable<OutputEmitMessage>[] = [];

    outputs.forEach(output => {
        const prop = output.property;
        const value = (node as any)[prop];

        if (value instanceof BehaviorSubject) {
            const stream = value.asObservable().pipe(
                skip(1), // 跳过初始值
                filter(v => v !== undefined),
                map(v => ({
                    type: 'output_emit' as const,
                    nodeId: node.id,
                    property: prop,
                    value: v
                }))
            );
            streams.push(stream);
        }
    });

    return streams.length > 0 ? merge(...streams) : null;
}
