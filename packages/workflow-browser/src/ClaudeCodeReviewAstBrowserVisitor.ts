import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { ClaudeCodeReviewAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class ClaudeCodeReviewAstBrowserVisitor {
  @Handler(ClaudeCodeReviewAst)
  handler(ast: ClaudeCodeReviewAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
