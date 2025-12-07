import { Injectable } from '@sker/core';
import { Handler, INode, StoreGetAst, StoreSetAst } from '@sker/workflow';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'
import { Observable } from 'rxjs';

@Injectable()
export class StoreGetAstVisitor {
    @Handler(StoreGetAst)
    handler(ast: StoreGetAst, ctx: any): Observable<INode> {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}

@Injectable()
export class StoreSetAstVisitor {
    @Handler(StoreSetAst)
    handler(ast: StoreSetAst, ctx: any): Observable<INode> {
        const controller = root.get(WorkflowController);
        if (!controller) {
            throw new Error('WorkflowController 未找到');
        }
        return controller.execute(ast);
    }
}