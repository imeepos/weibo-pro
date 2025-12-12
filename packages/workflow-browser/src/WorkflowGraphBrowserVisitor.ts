import { Injectable } from '@sker/core';
import { Handler, INode, WorkflowGraphAst } from '@sker/workflow';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 工作流图浏览器端执行器
 */
@Injectable()
export class WorkflowGraphBrowserVisitor {
  @Handler(WorkflowGraphAst)
  handler(ast: WorkflowGraphAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}