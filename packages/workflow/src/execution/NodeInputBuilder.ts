import { Observable, EMPTY, of } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { WorkflowGraphAst } from '../ast';
import { IEdge, ROUTE_SKIPPED } from '../types';
import { NodeEvent } from './events';
import { hasMultiMode } from '../decorator';
import { Injectable } from '@sker/core';

/**
 * 节点输入构建器
 *
 * 职责：
 * - 识别入口节点
 * - 按目标节点分组边
 * - 构建节点输入对象
 * - 分离普通边和 router 边
 * - 验证端口边数量
 */
@Injectable()
export class NodeInputBuilder {
    /**
     * 识别入口节点（入度为 0 的节点）
     */
    findEntryNodes(workflow: WorkflowGraphAst): string[] {
        const inDegrees = new Map<string, number>();
        workflow.nodes.forEach(node => inDegrees.set(node.id, 0));
        workflow.edges.forEach(edge => {
            inDegrees.set(edge.to, (inDegrees.get(edge.to) ?? 0) + 1);
        });

        return Array.from(inDegrees.entries())
            .filter(([_, degree]) => degree === 0)
            .map(([nodeId]) => nodeId);
    }

    /**
     * 按目标节点分组边
     */
    groupEdgesByTarget(edges: IEdge[]): Map<string, IEdge[]> {
        const edgesByTarget = new Map<string, IEdge[]>();
        edges.forEach(edge => {
            if (!edgesByTarget.has(edge.to)) {
                edgesByTarget.set(edge.to, []);
            }
            edgesByTarget.get(edge.to)!.push(edge);
        });
        return edgesByTarget;
    }

    /**
     * 分离普通边和 router 边
     */
    separateEdgesByType(
        edges: IEdge[],
        workflow: WorkflowGraphAst
    ): { normalEdges: IEdge[]; routerEdges: IEdge[] } {
        const normalEdges: IEdge[] = [];
        const routerEdges: IEdge[] = [];

        edges.forEach(edge => {
            const sourceNode = workflow.nodes.find(n => n.id === edge.from);
            const outputMeta = sourceNode?.metadata?.outputs?.find(
                (out: any) => out.property === edge.fromProperty
            );

            if (outputMeta?.isRouter) {
                routerEdges.push(edge);
            } else {
                normalEdges.push(edge);
            }
        });

        return { normalEdges, routerEdges };
    }

    /**
     * 构建节点输入对象
     *
     * 优先级：
     * 1. input[nodeId.property] - 精确匹配
     * 2. input[nodeId][property] - 嵌套对象
     * 3. node[property] - 节点自身属性
     * 4. inputMeta.defaultValue - 默认值
     */
    buildNodeInput(node: any, input: any): Record<string, any> {
        const nodeInput: Record<string, any> = {};
        const inputs = node.metadata?.inputs || [];

        inputs.forEach((inputMeta: any) => {
            const property = String(inputMeta.property);
            const propertyKey = `${node.id}.${property}`;

            if (input[propertyKey] !== undefined) {
                nodeInput[property] = input[propertyKey];
            } else if (input[node.id]?.[property] !== undefined) {
                nodeInput[property] = input[node.id][property];
            } else if (node[property] !== undefined) {
                nodeInput[property] = node[property];
            } else if (inputMeta.defaultValue !== undefined) {
                nodeInput[property] = inputMeta.defaultValue;
            }
        });

        return nodeInput;
    }

    /**
     * 验证端口的边数量是否符合 isMulti 标记
     *
     * 规则：如果一个端口有多条边连接，必须标记 mode: IS_MULTI
     */
    validatePortEdges(node: any, edges: IEdge[]): void {
        const inputs = node.metadata?.inputs || [];
        const edgesByPort = new Map<string, IEdge[]>();

        edges.forEach(edge => {
            if (!edge.toProperty) return;
            if (!edgesByPort.has(edge.toProperty)) {
                edgesByPort.set(edge.toProperty, []);
            }
            edgesByPort.get(edge.toProperty)!.push(edge);
        });

        edgesByPort.forEach((portEdges, portName) => {
            if (portEdges.length <= 1) return;

            const inputMeta = inputs.find((i: any) => i.property === portName);
            const isMulti = hasMultiMode(inputMeta?.mode);
            if (!isMulti) {
                throw new Error(
                    `[NodeInputBuilder] 节点 ${node.id} 的端口 "${portName}" ` +
                    `有 ${portEdges.length} 条边，但未标记 mode: IS_MULTI`
                );
            }
        });
    }
}
