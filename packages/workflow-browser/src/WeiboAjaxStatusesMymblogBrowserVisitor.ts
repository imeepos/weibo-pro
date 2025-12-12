import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 个人博文浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesMymblogBrowserVisitor {
  @Handler(WeiboAjaxStatusesMymblogAst)
  handler(ast: WeiboAjaxStatusesMymblogAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}