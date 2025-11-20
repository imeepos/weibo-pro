import { Injectable, root } from '@sker/core';
import { INPUT, OUTPUT, STATE, resolveConstructor, getInputMetadata, InputMetadata } from '../decorator';
import { fromJson } from '../generate';
import { IEdge, INode, hasCondition } from '../types';
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
    private resolveNestedProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    extractNodeOutputs(node: INode): any {
        try {
            const ast = fromJson(node);
            const ctor = resolveConstructor(ast);
            const outputs = root.get(OUTPUT);
            const states = root.get(STATE);
            const outputData: any = {};

            // 处理 @Output 装饰的属性
            if (outputs && outputs.length > 0) {
                outputs.filter(it => it.target === ctor).map(it => {
                    if ((node as any)[it.propertyKey] !== undefined) {
                        outputData[it.propertyKey] = (node as any)[it.propertyKey];
                    }
                });
            }

            // 处理 @State 装饰的属性 - 可以作为输出传递但不作为最终结果
            if (states && states.length > 0) {
                states.filter(it => it.target === ctor).map(it => {
                    if ((node as any)[it.propertyKey] !== undefined) {
                        outputData[it.propertyKey] = (node as any)[it.propertyKey];
                    }
                });
            }

            // 如果有装饰器定义，只返回装饰器标记的属性
            if ((outputs && outputs.length > 0) || (states && states.length > 0)) {
                return outputData;
            }
        } catch {
            // 装饰器元数据不可用，使用回退方案
        }

        // 回退方案：排除系统属性
        const outputData: any = {};
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
        const isMulti = metadata?.isMulti ?? false;

        if (isMulti) {
            if (!Array.isArray((targetNode as any)[propertyKey])) {
                (targetNode as any)[propertyKey] = [];
            }
            (targetNode as any)[propertyKey].push(value);
        } else {
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
     * - toProperty: 'array' → map(value => ({ array: value }))
     */
    createEdgeOperator(edge: IEdge): OperatorFunction<any, any> {
        const operators: OperatorFunction<any, any>[] = [];

        // 保存 fromProperty 以供后续使用
        let fromProperty: string | undefined;
        let hasFromProperty = false;

        // 1. fromProperty: 提取嵌套属性
        if (edge.fromProperty) {
            fromProperty = edge.fromProperty;
            hasFromProperty = true;
            operators.push(
                map((ast: any) => this.resolveProperty(ast, fromProperty!))
            );
        }

        // 2. condition: 条件过滤
        if (edge.condition) {
            const condition = edge.condition;
            operators.push(
                filter((data: any) => {
                    // 如果前面有 fromProperty，data 已经是提取的值
                    // 如果没有 fromProperty，data 是完整的 AST
                    const actualValue = hasFromProperty
                        ? data  // 已经提取的值，直接比较
                        : this.resolveProperty(data, condition.property);
                    return actualValue === condition.value;
                })
            );
        }

        // 3. toProperty: 数据包装
        if (edge.toProperty) {
            const toProperty = edge.toProperty;
            operators.push(
                map((value: any) => ({ [toProperty]: value }))
            );
        }

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
