import { Inject, Injectable, root } from '@sker/core';
import { Observable, EMPTY, merge, defer, ReplaySubject, concat, of, combineLatest, zip } from 'rxjs';
import { concatMap, finalize, map, filter } from 'rxjs/operators';
import { INode, IEdge, EdgeMode, isNode } from './types';
import { WorkflowGraphAst, isWorkflowGraphAst } from './ast';
import { NodeEmitEvent, NodeEvent } from './execution/events';
import { VisitorExecutor } from './execution/visitor-executor';
import { Compiler } from './compiler';
import { clone } from './utils';
import { resetNodeToDefaults } from './ast-utils';

/**
 * 节点执行器 - 统一的节点执行入口
 *
 * 设计哲学：
 * - 每个节点可以多次发射不同的值
 * - input$ 可以多次发射，每次发射触发一次节点执行
 * - WorkflowGraphAst 也是一个节点，平等对待
 */
@Injectable()
export class NodeExecutor {
    constructor(
        @Inject(VisitorExecutor) private visitorExecutor: VisitorExecutor,
        @Inject(Compiler) private compiler: Compiler
    ) { }

    /**
     * 执行节点
     *
     * @param node 要执行的节点
     * @param input$ 输入流（每次发射触发一次执行）
     * @returns 节点事件流
     */
    run<Input = any>(node: INode, input$: Observable<Input>, parent?: WorkflowGraphAst): Observable<NodeEvent> {
        // 确保节点已编译
        if (!isNode(node)) {
            node = this.compiler.compile(node);
        }

        // 统一处理：所有节点（包括 WorkflowGraphAst）都通过 VisitorExecutor
        return input$.pipe(
            concatMap(input => {
                // 克隆节点
                const nodeInstance = this.cloneNode(node);

                // 重置节点为默认值（防止上次执行的残留数据影响本次执行）
                resetNodeToDefaults(nodeInstance);

                // 将输入赋值给节点
                if (input && typeof input === 'object') {
                    Object.assign(nodeInstance, input);
                }

                // 调用 Visitor 执行
                return this.visitorExecutor.visit(nodeInstance, parent);
            })
        );
    }

    /**
     * 克隆节点
     */
    private cloneNode(node: INode): INode {
        try {
            if (typeof structuredClone !== 'undefined') {
                return structuredClone(node);
            }
        } catch { }

        return clone(node) as INode;
    }
}

/**
 * 执行节点（便捷函数）
 */
export function executeAst(node: INode, input?: any, parent?: WorkflowGraphAst): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(node, of(input || {}), parent);
}

/**
 * 执行工作流（便捷函数）
 */
export function executeWorkflow(workflow: WorkflowGraphAst, input?: any): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(workflow, of(input || {}));
}

/**
 * 执行工作流（立即执行，返回 Promise）
 */
export function executeWorkflowImmediate(workflow: WorkflowGraphAst, input?: any): Promise<WorkflowGraphAst> {
    return new Promise((resolve, reject) => {
        let finalWorkflow = workflow;

        executeWorkflow(workflow, input).subscribe({
            next: (event) => {
                if (event.type === 'node_success' && event.id === workflow.id) {
                    finalWorkflow = event.data as WorkflowGraphAst;
                }
            },
            complete: () => resolve(finalWorkflow),
            error: reject
        });
    });
}

/**
 * 在工作流上下文中执行节点
 */
export function executeAstWithWorkflowGraph(node: INode, input: any, workflow: WorkflowGraphAst): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(node, of(input || {}), workflow);
}

/**
 * 单独执行节点（不依赖工作流）
 */
export function executeNodeIsolated(node: INode, input?: any): Observable<NodeEvent> {
    const executor = root.get(NodeExecutor);
    return executor.run(node, of(input || {}));
}
