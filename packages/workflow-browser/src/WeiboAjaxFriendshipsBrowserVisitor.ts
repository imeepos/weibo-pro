import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxFriendshipsAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote';

/**
 * 关注列表浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFriendshipsBrowserVisitor {
  @Handler(WeiboAjaxFriendshipsAst)
  handler(ast: WeiboAjaxFriendshipsAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}