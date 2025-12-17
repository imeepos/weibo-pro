import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboAccountPickAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from './execute-remote.js';

/**
 * 热门微博浏览器端执行器
 */
@Injectable()
export class WeiboAccountPickAstBrowserVisitor {
  @Handler(WeiboAccountPickAst)
  handler(ast: WeiboAccountPickAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}