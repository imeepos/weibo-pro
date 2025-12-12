import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesLikeShowAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博点赞浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesLikeShowBrowserVisitor {
  @Handler(WeiboAjaxStatusesLikeShowAst)
  handler(ast: WeiboAjaxStatusesLikeShowAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}