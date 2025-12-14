import { Inject, Injectable } from '@sker/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { INode } from '../types';
import { WorkflowGraphAst } from '../ast';
import { VisitorExecutor } from './visitor-executor';

/**
 * 节点执行器 - 执行单个节点的业务逻辑
 *
 * 职责：
 * 1. 调用节点的 Handler（通过 VisitorExecutor 查找）
 * 2. 更新节点执行统计（count, emitCount）
 * 3. 管理节点状态转换（pending → running → success/fail）
 *
 * 注意：子工作流已在 NetworkBuilder.buildNetwork() 阶段展开，
 * 此处无需处理子工作流的递归执行。
 */
@Injectable()
export class NodeExecutor {
    constructor(@Inject(VisitorExecutor) private visitorExecutor: VisitorExecutor) {}

    /**
     * 执行单个节点
     */
    execute(
        node: INode,
        ast: WorkflowGraphAst,
        ctx?: WorkflowGraphAst
    ): Observable<INode> {
        // 标记节点为运行中
        const runningNode = { ...node };
        runningNode.state = 'running';
        runningNode.count = (runningNode.count ?? 0) + 1;

        // 使用 VisitorExecutor 执行 Handler
        return this.visitorExecutor.visit(runningNode, ctx ?? ast).pipe(
            tap(executedNode => {
                executedNode.emitCount = (executedNode.emitCount ?? 0) + 1;
            })
        );
    }
}
