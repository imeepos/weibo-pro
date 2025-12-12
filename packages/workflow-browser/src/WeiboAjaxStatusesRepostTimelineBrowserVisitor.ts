import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesRepostTimelineAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博转发浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesRepostTimelineBrowserVisitor {
  @Handler(WeiboAjaxStatusesRepostTimelineAst)
  handler(ast: WeiboAjaxStatusesRepostTimelineAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}