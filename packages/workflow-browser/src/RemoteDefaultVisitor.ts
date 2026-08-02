import { Injectable } from '@sker/core';
import { Ast, IDefaultVisitor, WorkflowGraphAst } from '@sker/workflow';
import { NodeEvent } from '@sker/workflow';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

/**
 * 远程默认访问者 - 前端使用
 *
 * 当节点没有找到对应的 @Handler 时，使用远程代理执行
 *
 * 设计理念：
 * - 前端默认使用远程执行，减轻客户端压力
 * - 通过 SSE 实时同步节点状态
 * - 与 DefaultVisitor 实现相同的接口，可透明替换
 */
@Injectable()
export class RemoteDefaultVisitor implements IDefaultVisitor {
    visit(ast: Ast, input$: Observable<any>, workflow?: WorkflowGraphAst): Observable<NodeEvent> {
        return handlerRemote(ast, input$, workflow);
    }
}
