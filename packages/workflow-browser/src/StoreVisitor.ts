import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from './execute-remote.js';

@Injectable()
export class StoreGetAstVisitor {
  @Handler(StoreGetAst)
  handler(ast: StoreGetAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}

@Injectable()
export class StoreSetAstVisitor {
  @Handler(StoreSetAst)
  handler(ast: StoreSetAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return handlerRemote(ast, $input, ctx)
  }
}
