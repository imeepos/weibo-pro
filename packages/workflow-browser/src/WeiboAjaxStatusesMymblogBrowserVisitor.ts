import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, WorkflowGraphAst } from '@sker/workflow';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { WorkflowController } from '@sker/sdk';

/**
 * 个人博文浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesMymblogBrowserVisitor {
  @Handler(WeiboAjaxStatusesMymblogAst)
  handler(ast: WeiboAjaxStatusesMymblogAst, ctx: WorkflowGraphAst): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}