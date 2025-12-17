import { Injectable } from '@sker/core'
import { Handler, LoopAst, NodeEvent } from '@sker/workflow'
import { Observable, concatMap } from 'rxjs'
import { executeRemote } from './execute-remote.js';
import { handlerRemote } from "./execute-remote.js";

@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    handler(ast: LoopAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
        return handlerRemote(ast, $input, ctx)
    }
}
