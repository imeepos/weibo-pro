import { Injectable } from '@sker/core';
import { Handler, INode, MqPullAst, MqPushAst } from '@sker/workflow';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from "./execute-remote.js";

@Injectable()
export class MqPullAstVisitor {
  @Handler(MqPullAst)
  handler(ast: MqPullAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx)
  }
}

@Injectable()
export class MqPushAstVisitor {
  @Handler(MqPushAst)
  handler(ast: MqPushAst, $input: Observable<any>, ctx: any) {
    return handlerRemote(ast, $input, ctx)
  }
}
