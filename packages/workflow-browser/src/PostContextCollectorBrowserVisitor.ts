import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote';

/**
 * 帖子上下文收集器浏览器端执行器
 */
@Injectable()
export class PostContextCollectorBrowserVisitor {
  @Handler(PostContextCollectorAst)
  handler(ast: PostContextCollectorAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}