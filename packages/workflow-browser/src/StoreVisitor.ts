import { Injectable } from '@sker/core';
import { Handler, INode, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class StoreGetAstVisitor {
  @Handler(StoreGetAst)
  handler(ast: StoreGetAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}

@Injectable()
export class StoreSetAstVisitor {
  @Handler(StoreSetAst)
  handler(ast: StoreSetAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
