import { Injectable } from "@sker/core";
import { Handler, INode } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { executeRemote } from "./execute-remote";

@Injectable()
export class LlmCategoryAstVisitor {
    @Handler(LlmCategoryAst)
    handler(ast: LlmCategoryAst, ctx: any): Observable<INode> {
        return executeRemote(ast);
    }
}
