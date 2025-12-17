import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxStatusesShowAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from './execute-remote.js';

/**
 * 微博帖子详情浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesShowBrowserVisitor {
  @Handler(WeiboAjaxStatusesShowAst)
  handler(ast: WeiboAjaxStatusesShowAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}
