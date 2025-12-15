import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 帖子 NLP 分析器浏览器端执行器
 */
@Injectable()
export class PostNLPAnalyzerBrowserVisitor {
  @Handler(PostNLPAnalyzerAst)
  handler(ast: PostNLPAnalyzerAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}