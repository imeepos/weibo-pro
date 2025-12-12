import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { ErrorAnalyzerAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class ErrorAnalyzerAstVisitor {
  @Handler(ErrorAnalyzerAst)
  handler(ast: ErrorAnalyzerAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
