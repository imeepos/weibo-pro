import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { INode, syncAstOutputs, type WorkflowEvent, type NodeStateEvent, type OutputEmitEvent, Ast } from '@sker/workflow';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';

/**
 * 类型守卫：判断是否为 output_emit 事件
 */
function isOutputEmitEvent(event: WorkflowEvent): event is OutputEmitEvent {
    return event.type === 'output_emit';
}

/**
 * 类型守卫：判断是否为 node_state 事件
 */
function isNodeStateEvent(event: WorkflowEvent): event is NodeStateEvent {
    return event.type === 'node_state';
}

/**
 * 统一的远程执行器
 *
 * 解决 SSE 返回数据与本地 AST 实例不一致的问题：
 * 1. 调用远程 API 执行工作流
 * 2. 实时处理 output_emit 事件，同步 BehaviorSubject 值到本地实例
 * 3. 返回节点状态更新流
 *
 * @param workflow 工作流 AST
 * @param input 可选的输入数据，传递给起始节点
 */
export function executeRemote(
    workflow: Ast,
    input?: Record<string, any>
): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
        throw new Error('WorkflowController 未注入，请确保已配置 SDK providers');
    }

    return controller.execute({ workflow, input }).pipe(
        tap((event: WorkflowEvent) => {
            // 实时处理 output_emit 事件
            if (isOutputEmitEvent(event)) {
                syncOutputEmit(workflow, event);
            }
        }),
        // 使用类型守卫过滤并缩窄类型
        filter(isNodeStateEvent),
        map((event: NodeStateEvent) => {
            const nodeData = event.data;
            // 最终同步（兼容旧逻辑，处理遗漏的 BehaviorSubject）
            if (nodeData.state === 'success') {
                syncAstOutputs(workflow, nodeData);
            }
            return nodeData;
        })
    );
}

/**
 * 实时同步 output_emit 事件到本地 BehaviorSubject
 */
function syncOutputEmit(localAst: INode, event: OutputEmitEvent): void {
    const { property, value } = event;
    const localValue = (localAst as any)[property];

    if (localValue instanceof BehaviorSubject) {
        localValue.next(value);
    }
}
