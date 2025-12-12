import { Injectable } from "@sker/core";
import { Handler, INode } from "@sker/workflow";
import { QueryRewriterAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { executeRemote } from "./execute-remote.js";

@Injectable()
export class QueryRewriterAstVisitor {
    @Handler(QueryRewriterAst)
    handler(ast: QueryRewriterAst, ctx: any): Observable<INode> {
        return executeRemote(ast);
    }
}
