import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { HttpRequestAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class HttpRequestAstBrowserVisitor {
  @Handler(HttpRequestAst)
  handler(ast: HttpRequestAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
