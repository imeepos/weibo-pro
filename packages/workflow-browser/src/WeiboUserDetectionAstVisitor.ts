import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboUserDetectionAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class WeiboUserDetectionAstVisitor {
  @Handler(WeiboUserDetectionAst)
  handler(ast: WeiboUserDetectionAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
