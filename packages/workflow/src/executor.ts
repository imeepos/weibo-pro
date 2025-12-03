import { WorkflowGraphAst } from "./ast";
import { Handler, OUTPUT } from "./decorator";
import { fromJson } from "./generate";
import { INode } from "./types";
import { ReactiveScheduler } from './execution/reactive-scheduler';
import { VisitorExecutor } from './execution/visitor-executor';
import { concat, Observable } from 'rxjs';
import { Injectable, root } from "@sker/core";
import { map } from 'rxjs/operators';

@Injectable()
export class WorkflowExecutorVisitor {
    /**
     * 执行工作流图（支持子工作流输入分发和输出实时传递）
     *
     * 核心机制：
     * 1. 将子工作流节点收到的输入值（格式：nodeId.property）分发给内部节点
     * 2. 执行子工作流内部所有节点
     * 3. 每次内部节点状态更新时，检查是否有未连接的输出节点 emitting
     * 4. 如果有，提取这些输出值并赋给子工作流节点
     * 5. 子工作流节点也发射 emitting 状态（带输出数据）
     * 6. 下游节点实时接收数据流
     */
    @Handler(WorkflowGraphAst)
    visit(ast: WorkflowGraphAst, ctx: WorkflowGraphAst): Observable<INode> {
        // 在执行前，将子工作流的输入分发给内部节点
        this.distributeInputsToInternalNodes(ast);

        const scheduler = root.get(ReactiveScheduler);

        return scheduler.schedule(ast, ctx).pipe(
            map(updatedWorkflow => {
                // 检查内部是否有 output 节点正在 emitting
                const exposedOutputs = this.extractExposedOutputsIfEmitting(updatedWorkflow);

                if (Object.keys(exposedOutputs).length > 0) {
                    // 有输出值发射，创建子工作流的 emitting 副本
                    const emittingWorkflow = { ...updatedWorkflow };
                    Object.assign(emittingWorkflow, exposedOutputs);
                    emittingWorkflow.state = 'emitting';
                    return emittingWorkflow;
                }

                // 没有输出或非 emitting 状态，返回原状态
                return updatedWorkflow;
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
            'position', 'color', 'collapsed', 'width', 'dynamicOutputs',
            'nodes', 'edges', 'entryNodeIds', 'viewport', 'tags', 'abortSignal'
        ];
        return builtinProps.includes(key);
    }

    /**
     * 提取正在 emitting 的未连接输出节点的值
     *
     * 逻辑：
     * - 只查找状态为 emitting 的节点
     * - 找到节点未连接的 @Output 端口
     * - 从节点实例中提取这些输出属性的值
     * - 按照 `${nodeId}.${property}` 格式返回（符合子工作流输出端口命名规范）
     *
     * 示例：
     * - 内部节点 ID: node-abc123, 输出属性: text
     * - 子工作流输出: { "node-abc123.text": "hello" }
     */
    private extractExposedOutputsIfEmitting(workflow: WorkflowGraphAst): Record<string, any> {
        const outputs: Record<string, any> = {};

        for (const node of workflow.nodes) {
            // 跳过子工作流自身
            if (node.type === 'WorkflowGraphAst') continue;

            // 只处理 emitting 状态的节点
            if (node.state !== 'emitting') continue;

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