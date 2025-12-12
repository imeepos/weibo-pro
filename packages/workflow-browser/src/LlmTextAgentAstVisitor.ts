import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { LlmTextAgentAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class LlmTextAgentAstVisitor {
  @Handler(LlmTextAgentAst)
  handler(ast: LlmTextAgentAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
