import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PersonaAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class PersonaAstBrowserVisitor {
  @Handler(PersonaAst)
  handler(ast: PersonaAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
