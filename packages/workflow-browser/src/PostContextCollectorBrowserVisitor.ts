import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

/**
 * 帖子上下文收集器浏览器端执行器
 */
@Injectable()
export class PostContextCollectorBrowserVisitor {
  @Handler(PostContextCollectorAst)
  handler(ast: PostContextCollectorAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}