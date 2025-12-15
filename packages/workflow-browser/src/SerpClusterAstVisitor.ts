import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { SerpClusterAst } from '@sker/workflow-ast';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class SerpClusterAstVisitor {
  @Handler(SerpClusterAst)
  handler(ast: SerpClusterAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}
