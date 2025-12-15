import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxFriendshipsAst } from '@sker/workflow-ast';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 关注列表浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFriendshipsBrowserVisitor {
  @Handler(WeiboAjaxFriendshipsAst)
  handler(ast: WeiboAjaxFriendshipsAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}