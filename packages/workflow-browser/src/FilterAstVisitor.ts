import { Injectable } from '@sker/core'
import { Handler, FilterAst, NodeEvent } from '@sker/workflow'
import { Observable } from 'rxjs'
import { executeRemote } from './execute-remote.js'

@Injectable()
export class FilterAstVisitor {
    @Handler(FilterAst)
    handler(ast: FilterAst, ctx: any): Observable<NodeEvent> {
        return executeRemote(ast, ctx)
    }
}
