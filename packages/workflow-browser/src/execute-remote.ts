import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { INode, syncAstOutputs, type SseMessage, type OutputEmitMessage, type NodeStateMessage, ROUTE_SKIPPED } from '@sker/workflow';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

/**
 * 类型守卫：判断是否为 output_emit 消息
 */
function isOutputEmitMessage(msg: SseMessage): msg is OutputEmitMessage {
    return msg.type === 'output_emit';
}

/**
 * 类型守卫：判断是否为 node_state 消息
 */
function isNodeStateMessage(msg: SseMessage): msg is NodeStateMessage {
    return msg.type === 'node_state';
}

/**
 * 统一的远程执行器
 *
 * 解决 SSE 返回数据与本地 AST 实例不一致的问题：
 * 1. 调用远程 API 执行节点
 * 2. 实时处理 output_emit 消息，同步 BehaviorSubject 值到本地实例
 * 3. 返回节点状态更新流
 *
 * SSE 消息格式：
 * - node_state: 节点状态更新
 * - output_emit: BehaviorSubject 发射的值（实时同步）
 */
export function executeRemote(ast: INode): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
        throw new Error('WorkflowController 未注入，请确保已配置 SDK providers');
    }

    return controller.execute(ast).pipe(
        tap((message: SseMessage) => {
            // 实时处理 output_emit 消息
            if (isOutputEmitMessage(message)) {
                syncOutputEmit(ast, message);
            }
        }),
        // 使用类型守卫过滤并缩窄类型
        filter(isNodeStateMessage),
        map((message: NodeStateMessage) => {
            const nodeData = message.data;
            // 最终同步（兼容旧逻辑，处理遗漏的 BehaviorSubject）
            if (nodeData.state === 'success') {
                syncAstOutputs(ast, nodeData);
            }
            return nodeData;
        })
    );
}

/**
 * 实时同步 output_emit 消息到本地 BehaviorSubject
 */
function syncOutputEmit(localAst: INode, message: OutputEmitMessage): void {
    const { property, value } = message;
    const localValue = (localAst as any)[property];

    if (localValue instanceof BehaviorSubject) {
        // 处理 ROUTE_SKIPPED（远程传输时变为 null/undefined）
        const syncValue = value === null || value === undefined ? ROUTE_SKIPPED : value;
        localValue.next(syncValue);
    }
}
