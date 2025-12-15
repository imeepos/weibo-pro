import { Injectable } from "@sker/core";
import { Handler, INode, NodeEvent } from "@sker/workflow";
import { QueryRewriterAst } from "@sker/workflow-ast";
import { Observable, concatMap } from "rxjs";
import { executeRemote } from "./execute-remote.js";

@Injectable()
export class QueryRewriterAstVisitor {
    @Handler(QueryRewriterAst)
    handler(ast: QueryRewriterAst, $input: Observable<any>, ctx: any): Observable<NodeEvent> {
        return $input.pipe(concatMap(input => executeRemote(ast, ctx, input)));
    }
}
