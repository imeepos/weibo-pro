import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { LlmTextAgentAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class LlmTextAgentAstVisitor {
  @Handler(LlmTextAgentAst)
  handler(ast: LlmTextAgentAst, $input: Observable<any>, ctx: any) {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}
