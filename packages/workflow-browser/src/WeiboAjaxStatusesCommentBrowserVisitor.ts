import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAjaxStatusesCommentAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
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
  handler(ast: WeiboAjaxStatusesCommentAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return new Observable(obs => {
      obs.next({ type: 'node_runing', id: ast.id })
      $input.pipe(concatMap(input => executeRemote(ast, ctx, input))).subscribe({
        next: (event) => obs.next(event),
        complete: () => {
          obs.next({ type: 'node_success', id: ast.id })
        },
        error: (error) => {
          obs.next({ type: 'node_fail', id: ast.id, error: error.message })
        }
      })
    })
  }
}