import { Injectable } from '@sker/core';
import { Handler, NodeEvent } from '@sker/workflow';
import { EmailD1Ast } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class EmailD1AstBrowserVisitor {
  @Handler(EmailD1Ast)
  handler(ast: EmailD1Ast, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx);
  }
}
