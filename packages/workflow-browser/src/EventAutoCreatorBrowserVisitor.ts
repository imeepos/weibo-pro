import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { EventAutoCreatorAst } from '@sker/workflow-ast';
import { Observable } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 事件自动创建器浏览器端执行器
 */
@Injectable()
export class EventAutoCreatorBrowserVisitor {
  @Handler(EventAutoCreatorAst)
  handler(ast: EventAutoCreatorAst, ctx: any): Observable<INode> {
    return executeRemote(ast);
  }
}
