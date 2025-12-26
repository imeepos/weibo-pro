import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { ClaudeCodeAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class ClaudeCodeAstBrowserVisitor {
  @Handler(ClaudeCodeAst)
  handler(ast: ClaudeCodeAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
