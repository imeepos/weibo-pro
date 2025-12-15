import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxStatusesRepostTimelineAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博转发浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesRepostTimelineBrowserVisitor {
  @Handler(WeiboAjaxStatusesRepostTimelineAst)
  handler(ast: WeiboAjaxStatusesRepostTimelineAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}