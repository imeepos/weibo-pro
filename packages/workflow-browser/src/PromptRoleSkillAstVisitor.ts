import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { PromptRoleSkillAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class PromptRoleSkillAstVisitor {
  @Handler(PromptRoleSkillAst)
  handler(ast: PromptRoleSkillAst, ctx: any): Observable<NodeEvent> {
    return executeRemote(ast, ctx);
  }
}
