import { Injectable, root } from '@sker/core';
import { INPUT, resolveConstructor, getInputMetadata, InputMetadata, hasMultiMode } from '../decorator';
import { fromJson } from '../generate';
import { IEdge, INode } from '../types';
import { Observable, OperatorFunction, pipe, map, filter, combineLatest } from 'rxjs';

/**
 * 数据流管理器 - 支持节点间数据传递和 RxJS 操作符映射
 *
 * 核心设计：
 * - 节点输出提取：基于装饰器元数据提取节点输出
 * - 节点输入分配：基于边定义自动分配输入数据
 * - 多值输入支持：@Input({ isMulti: true }) 自动聚合
 * - RxJS 操作符映射：将边定义转换为操作符链
 */
@Injectable()
export class DataFlowManager {
    /**
     * 解析属性路径（支持子工作流动态输出）
     *
     * 优先级：
     * 1. 先尝试直接访问完整路径（支持动态输出如 "nodeId.output"）
     * 2. 如果不存在，再按点号分割（支持嵌套对象如 "user.name"）
     */
    private resolveNestedProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }

        // 优先尝试直接访问完整路径（用于子工作流动态输出）
        if (obj?.[path] !== undefined) {
            return obj[path];
        }

        // 回退：按点号分割访问嵌套属性
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * 提取 WorkflowGraphAst 的动态输出属性
     *
     * 动态输出属性格式：nodeId.property
     * 由子工作流执行器在运行时添加，用于暴露内部节点的输出
     */
    private extractDynamicOutputs(node: INode, outputData: Record<string, any>): void {
        const builtinProps = [
            'id', 'type', 'name', 'description', 'state', 'error', 'count', 'emitCount',
            'position', 'color', 'collapsed', 'width',
            'nodes', 'edges', 'entryNodeIds', 'viewport', 'tags', 'abortSignal'
        ];

        for (const [key, value] of Object.entries(node as any)) {
            // 跳过内置属性
            if (builtinProps.includes(key)) {
                continue;
            }

            // 只提取包含点号的属性（nodeId.property 格式）
            if (key.includes('.') && value !== undefined) {
                outputData[key] = value;
            }
        }
    }

    extractNodeOutputs(node: INode): any {
        const outputData: any = {};
        const metadata = node.metadata;

        if (metadata) {
            // 从 metadata.outputs 提取输出
            for (const output of metadata.outputs) {
                const value = (node as any)[output.property];
                if (value !== undefined) {
                    outputData[output.property] = value;
                }
            }

            // 从 metadata.states 提取状态（可作为输出传递）
            for (const state of metadata.states) {
                const key = String(state.propertyKey);
                const value = (node as any)[key];
                if (value !== undefined) {
                    outputData[key] = value;
                }
            }

            // WorkflowGraphAst 需要额外包含动态输出属性
            if (node.type === 'WorkflowGraphAst') {
                this.extractDynamicOutputs(node, outputData);
            }

            return outputData;
        }

        // 回退：无 metadata 时排除系统属性
        const systemProperties = ['id', 'state', 'type'];
        for (const [key, value] of Object.entries(node as any)) {
            if (!systemProperties.includes(key) && value !== undefined) {
                outputData[key] = value;
            }
        }

        return outputData;
    }

    assignInputsToNode(targetNode: INode, allOutputs: Map<string, any>, edges: IEdge[], allNodes: INode[]): void {
        const incomingEdges = edges.filter(edge => edge.to === targetNode.id);

        const sortedEdges = [...incomingEdges].sort((a, b) => {
            const aPriority = a.condition ? 1 : 0;
            const bPriority = b.condition ? 1 : 0;
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            const aWeight = a.weight ?? Infinity;
            const bWeight = b.weight ?? Infinity;
            return aWeight - bWeight;
        });

        const inputMetadataMap = new Map<string | symbol, InputMetadata>();

        try {
            const ast = fromJson(targetNode);
            const ctor = resolveConstructor(ast);
            const allInputs = getInputMetadata(ctor);
            if (Array.isArray(allInputs)) {
                allInputs.forEach(meta => {
                    inputMetadataMap.set(meta.propertyKey, meta);
                });
            }
        } catch {
            // 装饰器元数据不可用，继续不支持 isMulti
        }

        sortedEdges.forEach(edge => {
            const sourceOutputs = allOutputs.get(edge.from);
            if (!sourceOutputs) return;

            const sourceNode = allNodes.find(n => n.id === edge.from);

            // 条件检查
            if (edge.condition) {
                if (!sourceNode || sourceNode.state !== 'success') return;
                const actualValue = (sourceNode as any)[edge.condition.property];
                if (actualValue !== edge.condition.value) {
                    return;
                }
            }

            // 数据映射
            if (edge.fromProperty && edge.toProperty) {
                const sourceValue = this.resolveNestedProperty(sourceOutputs, edge.fromProperty);
                if (sourceValue !== undefined) {
                    this.assignValueToProperty(targetNode, edge.toProperty, sourceValue, inputMetadataMap);
                }
            } else {
                Object.entries(sourceOutputs).forEach(([key, value]) => {
                    this.assignValueToProperty(targetNode, key, value, inputMetadataMap);
                });
            }
        });
    }

    private assignValueToProperty(
        targetNode: INode,
        propertyKey: string | symbol,
        value: any,
        inputMetadataMap: Map<string | symbol, InputMetadata>
    ): void {
        const metadata = inputMetadataMap.get(propertyKey);
        const shouldAggregate = hasMultiMode(metadata?.mode) || metadata?.isMulti;

        if (shouldAggregate) {
            // IS_MULTI 模式：累加到数组
            if (!Array.isArray((targetNode as any)[propertyKey])) {
                (targetNode as any)[propertyKey] = [];
            }
            (targetNode as any)[propertyKey].push(value);
        } else {
            // 单值模式：直接赋值
            (targetNode as any)[propertyKey] = value;
        }
    }

    initializeInputNodes(nodes: INode[], edges: IEdge[], context: Record<string, any>): void {
        for (const node of nodes) {
            const ast = fromJson(node);
            const ctor = resolveConstructor(ast);
            const inputs = root.get(INPUT, []).filter(it => it.target === ctor);

            for (const input of inputs) {
                const propertyKey = String(input.propertyKey);
                if (this.isInputProperty(node, propertyKey, edges)) {
                    const value = this.resolveContextValue(node.id, propertyKey, context);
                    if (value !== undefined) {
                        (node as any)[propertyKey] = value;
                    }
                }
            }
        }
    }

    private resolveContextValue(nodeId: string, propertyKey: string, context: Record<string, any>): any {
        const exactKey = `${nodeId}.${propertyKey}`;
        if (exactKey in context) {
            return context[exactKey];
        }
        if (propertyKey in context) {
            return context[propertyKey];
        }
        return undefined;
    }

    private isInputProperty(node: INode, propertyKey: string, edges: IEdge[]): boolean {
        const incomingEdges = edges.filter(edge => edge.to === node.id);

        const relevantEdges = incomingEdges.filter(edge => {
            return !edge.toProperty || edge.toProperty === propertyKey;
        });

        const hasUnconditionalEdge = relevantEdges.some(edge => !edge.condition);

        return !hasUnconditionalEdge;
    }

    /**
     * 将单个边转换为 RxJS 操作符链
     *
     * 映射规则：
     * - fromProperty: 'results' → map(ast => ast.results)
     * - fromProperty: 'currentItem.username' → map(ast => ast.currentItem.username)
     * - condition: { property: 'hasNext', value: true } → filter(ast => ast.hasNext === true)
     * - toProperty 由调用者处理，这里只提取值不包装
     */
    createEdgeOperator(edge: IEdge): OperatorFunction<any, any> {
        const operators: OperatorFunction<any, any>[] = [];

        // 1. condition: 条件过滤（必须先执行，在提取属性之前）
        if (edge.condition) {
            const condition = edge.condition;
            operators.push(
                filter((data: any) => {
                    const actualValue = this.resolveProperty(data, condition.property);
                    return actualValue === condition.value;
                })
            );
        }

        // 2. fromProperty: 提取嵌套属性（在过滤之后）
        if (edge.fromProperty) {
            operators.push(
                map((ast: any) => this.resolveProperty(ast, edge.fromProperty!))
            );
        }

        // 注意：toProperty 由 reactive-scheduler 的 mergeEdgeValues 处理
        // 这里只负责提取值，不包装

        // 如果没有任何操作符，返回原值
        if (operators.length === 0) {
            return pipe(map(x => x));
        }

        // 组合所有操作符
        return pipe(...operators as [OperatorFunction<any, any>]);
    }

    /**
     * 为多个边创建组合操作符
     *
     * 使用场景：
     * - 多输入节点（@Input({ isMulti: true })）
     * - 需要等待多个上游节点完成
     */
    createMultiEdgeOperator(
        sourceObservables: Map<string, Observable<any>>,
        edges: IEdge[]
    ): Observable<any[]> {
        // 为每条边创建对应的流
        const edgeStreams = edges.map(edge => {
            const sourceStream = sourceObservables.get(edge.from);
            if (!sourceStream) {
                throw new Error(`未找到源节点的 Observable: ${edge.from}`);
            }
            return sourceStream.pipe(this.createEdgeOperator(edge));
        });

        // 使用 combineLatest 等待所有上游完成
        return combineLatest(edgeStreams);
    }

    /**
     * 辅助方法：解析嵌套属性路径
     */
    private resolveProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}
