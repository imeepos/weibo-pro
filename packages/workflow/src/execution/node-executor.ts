import { Inject, Injectable } from '@sker/core';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
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
 * 设计原则：
 * - 纯函数：不修改传入的节点，而是返回新节点状态
 * - 流式：返回 Observable<INode>，支持多次发射
 * - 可组合：与 NetworkBuilder 无缝集成
 */
@Injectable()
export class NodeExecutor {
    constructor(@Inject(VisitorExecutor) private visitorExecutor: VisitorExecutor) {}

    /**
     * 执行单个节点
     *
     * 流程：
     * 1. 设置节点为 running 状态
     * 2. 增加执行计数
     * 3. 调用 VisitorExecutor 执行节点的 Handler
     * 4. 每次发射时更新发射计数
     * 5. 返回执行结果的 Observable
     *
     * @param node - 要执行的节点
     * @param ast - 完整的工作流 AST（作为执行上下文）
     * @param ctx - 执行上下文（可选）
     * @returns Observable<INode> - 节点执行结果流
     */
    execute(
        node: INode,
        ast: WorkflowGraphAst,
        ctx?: WorkflowGraphAst
    ): Observable<INode> {
        // Step 1: 标记节点为运行中
        const runningNode = { ...node };
        runningNode.state = 'running';
        runningNode.count = (runningNode.count ?? 0) + 1;

        // Step 2: 执行节点的 Handler（通过 VisitorExecutor）
        return this.visitorExecutor.visit(runningNode, ctx ?? ast).pipe(
            // Step 3: 每次发射时更新发射计数
            tap(executedNode => {
                executedNode.emitCount = (executedNode.emitCount ?? 0) + 1;
            })
        );
    }
}
