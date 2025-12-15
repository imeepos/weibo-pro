import { Injectable } from '@sker/core';
import { Handler, INode, NodeEvent } from '@sker/workflow';
import { EventAutoCreatorAst } from '@sker/workflow-ast';
import { Observable, concatMap } from 'rxjs';
import { executeRemote } from './execute-remote.js';

/**
 * 事件自动创建器浏览器端执行器
 */
@Injectable()
export class EventAutoCreatorBrowserVisitor {
  @Handler(EventAutoCreatorAst)
  handler(ast: EventAutoCreatorAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
    return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
  }
}
