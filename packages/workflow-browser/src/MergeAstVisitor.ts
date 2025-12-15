import { Injectable } from '@sker/core'
import { Handler, MergeAst, type MergeMode, NodeEvent } from '@sker/workflow'
import { Observable, concatMap } from 'rxjs'
import { executeRemote } from './execute-remote.js';

@Injectable()
export class MergeAstVisitor {
    @Handler(MergeAst)
    handler(ast: MergeAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
        return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
    }
}
