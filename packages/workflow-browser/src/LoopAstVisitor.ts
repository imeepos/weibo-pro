import { Injectable } from '@sker/core'
import { Handler, LoopAst, NodeEvent } from '@sker/workflow'
import { Observable, switchMap } from 'rxjs'
import { executeRemote } from './execute-remote.js';

@Injectable()
export class LoopAstVisitor {
    @Handler(LoopAst)
    handler(ast: LoopAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
        return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
    }
}
