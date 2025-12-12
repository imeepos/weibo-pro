import { Injectable, root } from "@sker/core";
import { WorkflowController } from "@sker/sdk";
import { Handler, INode } from "@sker/workflow";
import { LlmCategoryAst } from "@sker/workflow-ast";
import { Observable } from "rxjs";

@Injectable()
export class LlmCategoryAstVisitor {
    @Handler(LlmCategoryAst)
    handler(ast: LlmCategoryAst, ctx: any): Observable<INode> {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}
