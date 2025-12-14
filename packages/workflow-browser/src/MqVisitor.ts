import { Injectable } from '@sker/core';
import { Handler, INode, MqPullAst, MqPushAst } from '@sker/workflow';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

@Injectable()
export class MqPullAstVisitor {
  @Handler(MqPullAst)
  handler(ast: MqPullAst, ctx: any) {
    return executeRemote(ast, ctx);
  }
}

@Injectable()
export class MqPushAstVisitor {
  @Handler(MqPushAst)
  handler(ast: MqPushAst, ctx: any) {
    return executeRemote(ast, ctx);
  }
}
