import { WorkflowGraphAst } from "./ast";
import { Handler, OUTPUT } from "./decorator";
import { fromJson } from "./generate";
import { INode, isBehaviorSubject } from "./types";
import { ReactiveScheduler } from './execution/reactive-scheduler';
import { VisitorExecutor } from './execution/visitor-executor';
import { concat, Observable, of, BehaviorSubject } from 'rxjs';
import { Injectable, root } from "@sker/core";
import { map, concatMap } from 'rxjs/operators';
import { cleanOrphanedProperties } from "./ast-utils";

@Injectable()
export class WorkflowExecutorVisitor {
    /**
     * 执行工作流图（支持子工作流输入分发和输出实时传递）
     *
     * 核心机制：
     * 1. 将子工作流节点收到的输入值（格式：nodeId.property）分发给内部节点
     * 2. 执行子工作流内部所有节点
     * 3. 每次内部节点状态更新时，检查是否有未连接的输出节点
     * 4. 如果有，提取这些输出值并赋给子工作流节点
     * 5. 子工作流节点发射最终状态（带输出数据）
     * 6. 下游节点通过 BehaviorSubject 实时接收数据流
     */
    @Handler(WorkflowGraphAst)
    visit(ast: WorkflowGraphAst, ctx: WorkflowGraphAst): Observable<INode> {
        // 执行前清理不存在节点的动态属性
        cleanOrphanedProperties(ast);

        // 在执行前，将子工作流的输入分发给内部节点
        this.distributeInputsToInternalNodes(ast);

        const scheduler = root.get(ReactiveScheduler);

        return scheduler.schedule(ast, ctx).pipe(
            concatMap(updatedWorkflow => {
                // 只在子工作流完成时（最终状态）提取并暴露输出
                if (updatedWorkflow.state === 'success' || updatedWorkflow.state === 'fail') {
                    const exposedOutputs = this.extractExposedOutputs(updatedWorkflow);

                    const workflowWithOutputs = { ...updatedWorkflow };

                    // 如果有输出，附加到节点实例上
                    if (Object.keys(exposedOutputs).length > 0) {
                        Object.assign(workflowWithOutputs, exposedOutputs);
                    }

                    // 直接返回最终状态，不再需要 emitting
                    // 下游通过 BehaviorSubject 或 success 状态的属性提取数据
                    return of(workflowWithOutputs);
                }

                // 其他情况：直接返回原状态
                return of(updatedWorkflow);
            })
        );
    }

    /**
     * 将子工作流的输入分发给内部节点
     *
     * 逻辑：
     * - 遍历子工作流节点自身的所有属性
     * - 识别符合 `${nodeId}.${property}` 格式的属性
     * - 解析出目标节点 ID 和属性名（支持 nodeId 中包含点）
     * - 将值赋给内部对应节点的属性
     *
     * 示例：
     * - 子工作流接收: { "node-abc.text": "hello" }
     * - 分发结果: 内部节点 node-abc 的 text 属性 = "hello"
     *
     * 边界情况：
     * - 支持 nodeId 包含点：{ "node-abc.def.text": "hello" } → nodeId="node-abc.def", property="text"
     * - 跳过 undefined 值，保留内部节点的默认值
     */
    private distributeInputsToInternalNodes(workflow: WorkflowGraphAst): void {
        // 遍历子工作流自身的所有属性
        Object.entries(workflow).forEach(([key, value]) => {
            // 跳过非输入属性（内置属性）
            if (this.isBuiltinProperty(key)) {
                return;
            }

            // 跳过 undefined 值（保留内部节点的默认值）
            if (value === undefined) {
                return;
            }

            // 检查是否符合 nodeId.property 格式
            // 使用 lastIndexOf 确保支持 nodeId 中包含点的情况
            const lastDotIndex = key.lastIndexOf('.');
            if (lastDotIndex === -1) {
                return;
            }

            const nodeId = key.substring(0, lastDotIndex);
            const property = key.substring(lastDotIndex + 1);

            // 查找目标内部节点
            const targetNode = workflow.nodes.find(n => n.id === nodeId);
            if (!targetNode) {
                console.warn(`[WorkflowExecutorVisitor] 未找到目标节点: ${nodeId}`);
                return;
            }

            // 将值赋给内部节点
            (targetNode as any)[property] = value;
        });
    }

    /**
     * 检查是否是工作流内置属性（非输入属性）
     */
    private isBuiltinProperty(key: string): boolean {
        const builtinProps = [
            'id', 'type', 'name', 'description', 'state', 'error', 'count', 'emitCount',
            'position', 'color', 'collapsed', 'width',
            'nodes', 'edges', 'entryNodeIds', 'viewport', 'tags', 'abortSignal'
        ];
        return builtinProps.includes(key);
    }

    /**
     * 提取未连接输出节点的值（子工作流完成时调用）
     *
     * 逻辑：
     * - 只提取成功完成的节点（state = success）的输出
     * - 找到节点未连接的 @Output 端口
     * - 从节点实例中提取这些输出属性的值
     * - 按照 `${nodeId}.${property}` 格式返回（符合子工作流输出端口命名规范）
     *
     * 示例：
     * - 内部节点 ID: node-abc123, 输出属性: text
     * - 子工作流输出: { "node-abc123.text": "hello" }
     */
    private extractExposedOutputs(workflow: WorkflowGraphAst): Record<string, any> {
        const outputs: Record<string, any> = {};

        for (const node of workflow.nodes) {
            // 跳过子工作流自身
            if (node.type === 'WorkflowGraphAst') continue;

            // 只处理成功完成的节点
            if (node.state !== 'success') continue;

            try {
                // 获取节点的输出元数据
                const outputMetadatas = root.get(OUTPUT, []);
                const nodeOutputs = outputMetadatas.filter((meta: any) => {
                    // 通过节点类型匹配
                    return meta.target.name === node.type;
                });

                // 检查每个输出端口是否被连接
                for (const outputMeta of nodeOutputs) {
                    const property = String(outputMeta.propertyKey);
                    const isConnected = workflow.edges.some(edge =>
                        edge.from === node.id && edge.fromProperty === property
                    );

                    // 如果未连接，提取该输出值（使用 nodeId.property 格式）
                    if (!isConnected) {
                        const value = (node as any)[property];
                        if (value !== undefined) {
                            const outputKey = `${node.id}.${property}`;
                            outputs[outputKey] = value;
                        }
                    }
                }
            } catch (error) {
                // 忽略单个节点的错误，继续处理其他节点
                console.warn(`[WorkflowExecutorVisitor] 提取节点 ${node.id} 输出时出错:`, error);
            }
        }

        return outputs;
    }
}

/**
 * 执行单个 AST 节点
 *
 * 优雅设计：
 * - 返回 Observable 支持流式输出
 * - 自动转换 JSON 为 AST 实例
 * - 委托给 Visitor 执行
 */
export function executeAst<S extends INode>(state: S, context: WorkflowGraphAst): Observable<S> {
    const ast = fromJson(state);
    const visitor = root.get(VisitorExecutor)
    // 单步执行 每次返回单步执行后的 结果
    return visitor.visit(ast, context) as Observable<S>;
}

/**
 * 执行工作流中的节点及其所有下游（增量执行）
 *
 * 适用场景：
 * - 修改节点配置后，需要更新该节点及下游的执行结果
 * - 类似 Make 工具的增量编译
 *
 * @param nodeId 目标节点ID
 * @param context 工作流上下文
 */
export function executeAstWithWorkflowGraph(nodeId: string, context: WorkflowGraphAst) {
    const scheduler = root.get(ReactiveScheduler);
    return scheduler.fineTuneNode(context, nodeId);
}

/**
 * 执行单个节点（不影响下游）
 *
 * 适用场景：
 * - 测试单个节点逻辑
 * - 调试节点配置
 * - 不希望触发下游节点重新执行
 *
 * 前置条件：
 * - 所有上游节点必须已执行完成（使用历史输出作为输入）
 *
 * @param nodeId 目标节点ID
 * @param context 工作流上下文
 */
export function executeNodeIsolated(nodeId: string, context: WorkflowGraphAst) {
    const scheduler = root.get(ReactiveScheduler);
    return scheduler.executeNodeIsolated(context, nodeId);
}