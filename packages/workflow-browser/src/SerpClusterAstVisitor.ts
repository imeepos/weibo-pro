import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { SerpClusterAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class SerpClusterAstVisitor {
  @Handler(SerpClusterAst)
  handler(ast: SerpClusterAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
