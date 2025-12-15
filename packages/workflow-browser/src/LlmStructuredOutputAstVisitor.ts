import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { LlmStructuredOutputAst } from '@sker/workflow-ast';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class LlmStructuredOutputAstVisitor {
  @Handler(LlmStructuredOutputAst)
  handler(ast: LlmStructuredOutputAst, $input: Observable<any>, ctx: any) {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}
