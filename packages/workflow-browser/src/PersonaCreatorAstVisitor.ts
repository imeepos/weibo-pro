import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PersonaCreatorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class PersonaCreatorAstVisitor {
  @Handler(PersonaCreatorAst)
  handler(ast: PersonaCreatorAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
