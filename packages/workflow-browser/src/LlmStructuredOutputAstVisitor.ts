import { Injectable, root } from "@sker/core";
import { WorkflowController } from "@sker/sdk";
import { Handler, INode } from "@sker/workflow";
import { LlmStructuredOutputAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";


@Injectable()
export class LlmStructuredOutputAstVisitor {
    @Handler(LlmStructuredOutputAst)
    handler(ast: LlmStructuredOutputAst, ctx: any): Observable<INode> {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}
