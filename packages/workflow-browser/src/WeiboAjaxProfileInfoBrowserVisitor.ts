import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxProfileInfoAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from './execute-remote.js';

/**
 * 用户信息浏览器端执行器
 */
@Injectable()
export class WeiboAjaxProfileInfoBrowserVisitor {
  @Handler(WeiboAjaxProfileInfoAst)
  handler(ast: WeiboAjaxProfileInfoAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}