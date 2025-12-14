import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Ast, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { Observable } from 'rxjs';
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
    ast: Ast,
    parent: WorkflowGraphAst,
    input: Record<string, any> = {}
): Observable<NodeEvent> {
    const controller = root.get(WorkflowController);
    if (!controller) {
        throw new Error('WorkflowController 未注入，请确保已配置 SDK providers');
    }
    return controller.execute({ ast, workflow: parent, input })
}
