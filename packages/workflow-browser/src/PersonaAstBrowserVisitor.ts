import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { PersonaAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class PersonaAstBrowserVisitor {
  @Handler(PersonaAst)
  handler(ast: PersonaAst, $input: Observable<any>, ctx: any) {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}
