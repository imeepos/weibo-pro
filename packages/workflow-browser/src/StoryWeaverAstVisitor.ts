import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { StoryWeaverAst } from '@sker/workflow-ast';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class StoryWeaverAstVisitor {
  @Handler(StoryWeaverAst)
  handler(ast: StoryWeaverAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}