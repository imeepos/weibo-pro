import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 帖子 NLP 分析器浏览器端执行器
 */
@Injectable()
export class PostNLPAnalyzerBrowserVisitor {
  @Handler(PostNLPAnalyzerAst)
  handler(ast: PostNLPAnalyzerAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}