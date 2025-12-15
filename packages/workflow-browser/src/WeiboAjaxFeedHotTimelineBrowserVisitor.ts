import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 热门微博浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFeedHotTimelineBrowserVisitor {
  @Handler(WeiboAjaxFeedHotTimelineAst)
  handler(ast: WeiboAjaxFeedHotTimelineAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}