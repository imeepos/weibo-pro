import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote';

/**
 * 热门微博浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFeedHotTimelineBrowserVisitor {
  @Handler(WeiboAjaxFeedHotTimelineAst)
  handler(ast: WeiboAjaxFeedHotTimelineAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}