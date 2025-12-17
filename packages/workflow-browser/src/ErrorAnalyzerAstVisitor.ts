import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, setAstError } from '@sker/workflow';
import { ErrorAnalyzerAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote, handlerRemote } from './execute-remote.js';

@Injectable()
export class ErrorAnalyzerAstVisitor {
  @Handler(ErrorAnalyzerAst)
  handler(ast: ErrorAnalyzerAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}
