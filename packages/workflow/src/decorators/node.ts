import { InjectionToken, root, Type } from '@sker/core'

/**
 * 获取所有已注册的节点类型
 */
export function getAllNodeTypes(): Type<any>[] {
    const nodeMetadatas = root.get(NODE, [])
    return nodeMetadatas.map(metadata => metadata.target)
}

export function findNodeType<T = any>(name: string): Type<T> | undefined {
    return getAllNodeTypes().find((type: any) => type.name === name)
}

export function resolveConstructor(target: object | Type<any>): Type<any> {
    if (typeof target === 'function') {
        return target as Type<any>;
    }
    const typeName = Reflect.get(target, 'type')
    const type = findNodeType(typeName)
    if (type) return type;
    if (target && typeof target === 'object' && typeof (target as { constructor?: unknown }).constructor === 'function') {
        return (target as { constructor: Type<any> }).constructor;
    }
    throw new Error('Workflow decorators expect to receive a class constructor or instance.');
}

export type NodeType = `llm` | `basic` | `crawler` | `control` | `sentiment` | `analysis` | `scheduler`;

/**
 * 错误处理策略
 *
 * - retry: 自动重试（适用于网络波动、临时故障）
 * - skip: 跳过失败节点，继续执行下游（适用于可选节点）
 * - fail: 标记失败但不中断工作流（默认行为）
 * - abort: 中断整个工作流（适用于关键节点）
 */
export type ErrorStrategy = 'retry' | 'skip' | 'fail' | 'abort';

export interface NodeOptions {
    title?: string;
    type?: NodeType;
    dynamicInputs?: boolean;
    dynamicOutputs?: boolean;

    /** 错误处理策略 */
    errorStrategy?: ErrorStrategy;
    /** 最大重试次数（仅对 retry 策略有效） */
    maxRetries?: number;
    /** 重试延迟（毫秒，仅对 retry 策略有效） */
    retryDelay?: number;
    /** 重试延迟增长因子（指数退避） */
    retryBackoff?: number;

    /** 状态保留：true 时节点在工作流运行时保留数据，不重置为默认值 */
    stateful?: boolean;
}

export interface NodeMetadata extends NodeOptions {
    target: Type<any>;
}

export const NODE = new InjectionToken<NodeMetadata[]>(`NODE`)
export function Node(options: NodeOptions = {}): ClassDecorator {
    return (target) => {
        const ctor = resolveConstructor(target as object);
        root.set([{ provide: NODE, useValue: { target: ctor, ...options }, multi: true }])
    };
}
