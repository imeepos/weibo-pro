import { Injectable } from '@sker/core';
import { Handler, INode, MqPullAst, MqPushAst } from '@sker/workflow';
import { Observable, switchMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class MqPullAstVisitor {
  @Handler(MqPullAst)
  handler(ast: MqPullAst, $input: Observable<any>, ctx: any) {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}

@Injectable()
export class MqPushAstVisitor {
  @Handler(MqPushAst)
  handler(ast: MqPushAst, $input: Observable<any>, ctx: any) {
    return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
  }
}
