import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PersonaCreatorAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class PersonaCreatorAstVisitor {
  @Handler(PersonaCreatorAst)
  handler(ast: PersonaCreatorAst, $input: Observable<any>, ctx: any) {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}
