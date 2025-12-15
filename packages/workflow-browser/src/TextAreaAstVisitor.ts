import { Injectable } from "@sker/core";
import { Handler, TextAreaAst, NodeEvent } from "@sker/workflow";
import { Observable } from "rxjs";
import { executeRemote } from "./execute-remote.js";

@Injectable()
export class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    handler(ast: TextAreaAst, ctx: any): Observable<NodeEvent> {
        return executeRemote(ast, ctx);
    }
}