import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { StoryWeaverAst } from '@sker/workflow-ast';

@Injectable()
export class StoryWeaverAstVisitor {
  @Handler(StoryWeaverAst)
  handler(ast: StoryWeaverAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}