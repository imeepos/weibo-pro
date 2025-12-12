import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { LlmStructuredOutputAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class LlmStructuredOutputAstVisitor {
  @Handler(LlmStructuredOutputAst)
  handler(ast: LlmStructuredOutputAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
