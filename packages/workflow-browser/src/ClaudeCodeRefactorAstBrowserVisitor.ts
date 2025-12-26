import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { ClaudeCodeRefactorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class ClaudeCodeRefactorAstBrowserVisitor {
  @Handler(ClaudeCodeRefactorAst)
  handler(ast: ClaudeCodeRefactorAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
