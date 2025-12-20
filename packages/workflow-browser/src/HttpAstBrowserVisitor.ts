import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { HttpAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class HttpAstBrowserVisitor {
  @Handler(HttpAst)
  handler(ast: HttpAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
