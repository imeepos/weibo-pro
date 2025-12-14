import { Injectable } from "@sker/core";
import { Handler, INode, NodeEvent } from "@sker/workflow";
import { ResearchPlannerAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";
import { executeRemote } from "./execute-remote.js";

@Injectable()
export class ResearchPlannerAstVisitor {
    @Handler(ResearchPlannerAst)
    handler(ast: ResearchPlannerAst, ctx: any): Observable<NodeEvent> {
        return executeRemote(ast, ctx);
    }
}
