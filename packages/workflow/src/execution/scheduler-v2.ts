import { WorkflowGraphAst } from '../ast';
import { INode, IAstStates } from '../types';
import { WorkflowScheduler } from './scheduler';
import { Observable, of, EMPTY } from 'rxjs';
import { expand, map, catchError, takeWhile, last } from 'rxjs/operators';
import { Injectable } from '@sker/core';

/**
 * WorkflowScheduler 增强版 - 使用 RxJS expand 自动递归调度
 *
 * 核心设计：
 * - 保留所有现有功能（继承 WorkflowScheduler）
 * - 使用 RxJS expand 操作符实现自动递归调度
 * - 内部优化，保持 AST 接口不变
 *
 * 优势：
 * - 声明式调度：从命令式 while 循环改为声明式 expand
 * - 自动递归：不需要外部循环调用
 * - 流式输出：每批执行完都可以发射中间状态
 */
@Injectable()
export class WorkflowSchedulerV2 extends WorkflowScheduler {
    /**
     * 使用 RxJS expand 自动递归调度工作流
     *
     * 执行流程：
     * 1. 初始化输入节点（如果是 pending 状态）
     * 2. 使用 expand 自动递归：
     *    - 找到可执行节点
     *    - 并发执行当前批次
     *    - 更新节点状态
     *    - 判断是否完成（所有可达节点都已完成）
     *    - 如果未完成且有可执行节点，继续递归
     * 3. 返回最终状态
     *
     * @param ast 工作流图 AST
     * @param ctx 执行上下文
     * @returns Observable<INode> 工作流执行结果
     */
    schedule(ast: WorkflowGraphAst, ctx: any): Observable<INode> {
        const { state } = ast;

        // 已完成的工作流直接返回
        if (state === 'success' || state === 'fail') {
            return of(ast);
        }

        // 初始化输入节点
        if (state === 'pending' && ctx) {
            this['dataFlowManager'].initializeInputNodes(ast.nodes, ast.edges, ctx);
        }

        ast.state = 'running';

        // 使用 expand 自动递归调度
        return of(ast).pipe(
            expand(currentAst => {
                // 找到可执行节点
                const executableNodes = this['dependencyAnalyzer'].findExecutableNodes(
                    currentAst.nodes,
                    currentAst.edges
                );

                // 如果没有可执行节点，停止递归
                if (executableNodes.length === 0) {
                    return EMPTY;
                }

                // 并发执行当前批次
                return this['executeCurrentBatch'](
                    executableNodes,
                    ctx,
                    currentAst.edges,
                    currentAst.nodes
                ).pipe(
                    map(({ nodes: newlyExecutedNodes }) => {
                        // 合并节点状态
                        const updatedNodes = this['stateMerger'].mergeNodeStates(
                            currentAst.nodes,
                            newlyExecutedNodes
                        );

                        // 判断是否所有可达节点都已完成
                        const allReachableCompleted = this['dependencyAnalyzer'].areAllReachableNodesCompleted(
                            updatedNodes,
                            currentAst.edges
                        );
                        const hasFailures = updatedNodes.some(node => node.state === 'fail');

                        // 确定当前状态
                        const currentState: IAstStates = allReachableCompleted
                            ? (hasFailures ? 'fail' : 'success')
                            : 'running';

                        currentAst.nodes = updatedNodes;
                        currentAst.state = currentState;

                        return currentAst;
                    })
                );
            }),
            // 持续执行直到状态不再是 running
            takeWhile(currentAst => currentAst.state === 'running', true),
            // 获取最后一个状态（即最终状态）
            last(),
            catchError(error => {
                // 调度失败，设置工作流为失败状态
                ast.state = 'fail';
                ast.setError(error);
                return of(ast);
            })
        );
    }
}
