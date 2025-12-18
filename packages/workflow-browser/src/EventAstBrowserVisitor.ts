import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { EventAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class EventAstBrowserVisitor {
  @Handler(EventAst)
  handler(ast: EventAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx);
  }
}
