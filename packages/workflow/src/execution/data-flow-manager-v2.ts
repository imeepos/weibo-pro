import { Injectable } from '@sker/core';
import { Observable, OperatorFunction, pipe, map, filter, combineLatest } from 'rxjs';
import { IEdge, IDataEdge, IControlEdge, isControlEdge, isDataEdge } from '../types';
import { Ast } from '../ast';
import { DataFlowManager } from './data-flow-manager';

/**
 * DataFlowManager 增强版 - 支持将边定义转换为 RxJS 操作符
 *
 * 核心设计：
 * - 保留所有现有功能（继承 DataFlowManager）
 * - 新增 RxJS 操作符映射能力
 * - 边定义格式不变（IDataEdge, IControlEdge）
 */
@Injectable()
export class DataFlowManagerV2 extends DataFlowManager {
    /**
     * 将单个边转换为 RxJS 操作符链
     *
     * 映射规则：
     * - fromProperty: 'results' → map(ast => ast.results)
     * - fromProperty: 'currentItem.username' → map(ast => ast.currentItem.username)
     * - condition: { property: 'hasNext', value: true } → filter(ast => ast.hasNext === true)
     * - toProperty: 'array' → map(value => ({ array: value }))
     *
     * @param edge 边定义
     * @returns RxJS 操作符函数
     */
    createEdgeOperator(edge: IEdge): OperatorFunction<any, any> {
        const operators: OperatorFunction<any, any>[] = [];

        // 保存 fromProperty 以供后续使用
        let fromProperty: string | undefined;
        let hasFromProperty = false;

        // 1. fromProperty: 提取嵌套属性
        if (isDataEdge(edge) && edge.fromProperty) {
            fromProperty = edge.fromProperty;
            hasFromProperty = true;
            operators.push(
                map((ast: any) => this.resolveProperty(ast, fromProperty!))
            );
        }

        // 2. condition: 条件过滤（IControlEdge）
        if (isControlEdge(edge) && edge.condition) {
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
        if (isDataEdge(edge) && edge.toProperty) {
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
     *
     * @param edges 边列表
     * @returns 返回组合后的 Observable
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
     *
     * 示例：
     * - resolveProperty({ a: { b: { c: 1 } } }, 'a.b.c') → 1
     * - resolveProperty({ user: { name: 'Alice' } }, 'user.name') → 'Alice'
     */
    private resolveProperty(obj: any, path: string): any {
        if (!path.includes('.')) {
            return obj?.[path];
        }
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}
