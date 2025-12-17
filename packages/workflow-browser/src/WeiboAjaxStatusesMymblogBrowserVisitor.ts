import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from './execute-remote.js';

/**
 * 个人博文浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesMymblogBrowserVisitor {
  @Handler(WeiboAjaxStatusesMymblogAst)
  handler(ast: WeiboAjaxStatusesMymblogAst, $input: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent> {
   return handlerRemote(ast, $input, ctx)
  }
}