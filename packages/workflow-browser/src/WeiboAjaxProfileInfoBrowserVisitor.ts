import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxProfileInfoAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote';

/**
 * 用户信息浏览器端执行器
 */
@Injectable()
export class WeiboAjaxProfileInfoBrowserVisitor {
  @Handler(WeiboAjaxProfileInfoAst)
  handler(ast: WeiboAjaxProfileInfoAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}