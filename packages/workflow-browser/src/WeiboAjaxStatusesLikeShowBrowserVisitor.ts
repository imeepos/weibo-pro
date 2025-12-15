import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxStatusesLikeShowAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博点赞浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesLikeShowBrowserVisitor {
  @Handler(WeiboAjaxStatusesLikeShowAst)
  handler(ast: WeiboAjaxStatusesLikeShowAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}