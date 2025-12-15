import { Handler, type DynamicOutput, ROUTE_SKIPPED, NodeEvent } from '@sker/workflow'
import { Injectable } from '@sker/core'
import { SwitchAst } from '@sker/workflow-ast'
import { Observable, switchMap } from 'rxjs'
import { executeRemote } from './execute-remote.js';

@Injectable()
export class SwitchAstVisitor {
    @Handler(SwitchAst)
    handler(ast: SwitchAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
        return $input.pipe(switchMap(input => executeRemote(ast, ctx, input)));
    }
}
