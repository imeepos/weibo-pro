import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 微博关键词搜索浏览器端执行器
 */
@Injectable()
export class WeiboKeywordSearchBrowserVisitor {
  @Handler(WeiboKeywordSearchAst)
  handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
