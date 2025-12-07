import { Injectable } from '@sker/core';
import { Handler, INode, MqPullAst, MqPushAst } from '@sker/workflow';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'
import { Observable } from 'rxjs';

@Injectable()
export class MqPullAstVisitor {
    @Handler(MqPullAst)
    handler(ast: MqPullAst, ctx: any): Observable<INode> {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}

@Injectable()
export class MqPushAstVisitor {
    @Handler(MqPushAst)
    handler(ast: MqPushAst, ctx: any): Observable<INode> {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}