import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博关键词搜索浏览器端执行器
 */
@Injectable()
export class WeiboKeywordSearchBrowserVisitor {
  @Handler(WeiboKeywordSearchAst)
  handler(ast: WeiboKeywordSearchAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}
