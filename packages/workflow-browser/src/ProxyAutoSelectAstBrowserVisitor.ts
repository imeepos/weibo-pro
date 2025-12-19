import { Injectable } from '@sker/core';
import { Handler, NodeEvent } from '@sker/workflow';
import { ProxyAutoSelectAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class ProxyAutoSelectAstBrowserVisitor {
  @Handler(ProxyAutoSelectAst)
  handler(ast: ProxyAutoSelectAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}
