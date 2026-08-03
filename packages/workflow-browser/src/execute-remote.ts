import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Ast, NodeEvent, setAstError, WorkflowGraphAst } from '@sker/workflow';
import { concatMap, from, map, mergeMap, Observable, tap, } from 'rxjs';
import { ErrorHandlerOperators } from './error-handler.util.js';
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
): Observable<NodeEvent[]> {
    const controller = root.get(WorkflowController);
    if (!controller) {
        throw new Error('WorkflowController 未注入，请确保已配置 SDK providers');
    }
    return controller.execute({ ast, workflow: parent, input }).pipe(
        tap((event: NodeEvent) => {
            // 同步状态
            if (event.id !== ast.id) return;

            switch (event.type) {
                case 'node_emit':
                    Object.assign(ast, event.data);
                    break;
                case 'node_fail':
                    ast.state = 'fail';
                    setAstError(ast, new Error(event.error))
                    break;
            }
        }),
        map((event: NodeEvent) => {
            if (event.id === ast.id && event.type === 'node_fail') {
                return [event];
            }
            // 只允许 node_emit、node_progress、node_delta 通过
            if (event.type === 'node_emit' || event.type === 'node_progress' || event.type === 'node_delta') {
                return [event];
            }
            return [];
        })
    )
}
export function handlerRemote(ast: Ast, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
        ast.state = 'running'
        obs.next({ type: 'node_runing', id: ast.id })
        $input.pipe(
            concatMap(input => executeRemote(ast, ctx, input)),
            ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[ClaudeCodeRefactorAstVisitor]' }),
            ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[ClaudeCodeRefactorAstVisitor]' }),
            mergeMap((events: NodeEvent[]) => from(events))
        ).subscribe({
            next: (event) => obs.next(event),
            complete: () => {
                // 错误经 catchError 处理后 ast.state 已为 'fail'，不应再标记为成功
                if (ast.state !== 'fail') {
                    ast.state = 'success';
                    ast.error = undefined;
                    obs.next({ type: 'node_success', id: ast.id })
                }
                obs.complete();
            },
            error: (error) => {
                ast.state = 'fail';
                setAstError(ast, error)
                obs.next({ type: 'node_fail', id: ast.id, error: error.message })
            }
        })
    })
}