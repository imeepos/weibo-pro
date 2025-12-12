import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesCommentAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博评论浏览器端执行器
 *
 * 存在即合理：
 * - 浏览器端无法直接获取微博评论，必须通过后端API执行
 * - 负责调用后端通用执行接口，传递评论获取参数
 */
@Injectable()
export class WeiboAjaxStatusesCommentBrowserVisitor {
  @Handler(WeiboAjaxStatusesCommentAst)
  handler(ast: WeiboAjaxStatusesCommentAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}