import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 工作流图浏览器端执行器
 */
@Injectable()
export class WorkflowGraphBrowserVisitor {
  @Handler(WorkflowGraphAst)
  handler(ast: WorkflowGraphAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}