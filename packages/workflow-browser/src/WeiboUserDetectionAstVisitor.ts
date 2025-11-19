import { Injectable, root } from "@sker/core";
import { WorkflowController } from "@sker/sdk";
import { Handler } from "@sker/workflow";
import { WeiboUserDetectionAst } from "@sker/workflow-ast";


@Injectable()
export class WeiboUserDetectionAstVisitor {

    @Handler(WeiboUserDetectionAst)
    handler(ast: WeiboUserDetectionAst, ctx: any) {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}