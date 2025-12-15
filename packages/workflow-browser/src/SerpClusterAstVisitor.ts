import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { SerpClusterAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class SerpClusterAstVisitor {
  @Handler(SerpClusterAst)
  handler(ast: SerpClusterAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}
