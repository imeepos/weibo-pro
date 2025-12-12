import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesShowAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博帖子详情浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesShowBrowserVisitor {
  @Handler(WeiboAjaxStatusesShowAst)
  handler(ast: WeiboAjaxStatusesShowAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
