import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class PromptRoleSkillAstVisitor {
  @Handler(PromptRoleSkillAst)
  handler(ast: PromptRoleSkillAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}
