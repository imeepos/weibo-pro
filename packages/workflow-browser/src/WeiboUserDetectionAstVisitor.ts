import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { WeiboUserDetectionAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class WeiboUserDetectionAstVisitor {
  @Handler(WeiboUserDetectionAst)
  handler(ast: WeiboUserDetectionAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}
