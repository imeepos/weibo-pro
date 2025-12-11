// 抽象语法树的核心表达 - 万物皆为状态
// - pending: 等待执行
// - running: 执行中但未产生输出
// - success: 执行完成
// - fail: 执行失败

import { SerializedError } from "@sker/core";
import { BehaviorSubject } from "rxjs";
import { InputFieldType, NodeType } from "./decorator";

export type IAstStates = `pending` | `running` | `success` | `fail`;

/**
 * 判断值是否为 BehaviorSubject
 */
export function isBehaviorSubject<T = any>(value: unknown): value is BehaviorSubject<T> {
    return value instanceof BehaviorSubject;
}

// 状态数据的基础约束
export interface INodeMetadata {
    title?: string;
    type?: NodeType;
    dynamicInputs?: boolean;
    dynamicOutputs?: boolean;

    /** 错误处理策略 */
    errorStrategy?: 'retry' | 'skip' | 'fail' | 'abort';
    /** 最大重试次数（仅对 retry 策略有效） */
    maxRetries?: number;
    /** 重试延迟（毫秒，仅对 retry 策略有效） */
    retryDelay?: number;
    /** 重试延迟增长因子（指数退避） */
    retryBackoff?: number;
}
export interface INodeInputMetadata {
    property: string;
    mode?: number;
    required?: boolean;
    defaultValue?: any;
    title?: string;
    description?: string;
    type?: InputFieldType;
    isStatic?: boolean;  // 装饰器定义的端口为 true，动态添加的为 false
}
export interface INodeOutputMetadata {
    property: string;
    title?: string;
    description?: string;
    type?: string;
    // 路由节点支持
    isRouter?: boolean;      // 标识为路由输出，Scheduler 会过滤 undefined 值
    dynamic?: boolean;       // 支持 UI 动态添加输出端口
    condition?: string;      // 条件表达式字符串（如 '$input === 1'）
    isStatic?: boolean;      // 装饰器定义的端口为 true，动态添加的为 false
    isSubject?: boolean;     // 标识为 BehaviorSubject 类型，序列化时跳过
}
export interface INodeStateMetadata {
    propertyKey: string | symbol;
    title?: string;
    type?: string;
}
export function isNode(val: any): val is Required<INode> {
    return val && val.metadata
}
export interface INode extends Record<string, any> {
    // 标题
    name?: string;
    // 简介
    description?: string;
    // 自定义颜色
    state: IAstStates;
    // 运行次数
    count: number;
    color?: string;
    // 发射次数
    emitCount: number;
    // 编号
    id: string;
    // 类型
    type: string;
    // 报错
    error: SerializedError | undefined;
    // 位置
    position: { x: number; y: number };
    // 父节点ID（用于分组）
    parentId?: string;
    // 元数据
    metadata?: {
        class: INodeMetadata;
        inputs: INodeInputMetadata[];
        outputs: INodeOutputMetadata[];
        states: INodeStateMetadata[];
    }
}

// 边的流式合并模式 - 定义上游如何触发下游
export enum EdgeMode {
    /** 任一上游发射立即触发下游（默认，适合并发场景） */
    MERGE = 'merge',

    /** 配对执行：上游数组按索引配对触发（适合 mid[1,2,3] + uid[4,5,6] → 3次执行） */
    ZIP = 'zip',

    /** 任一上游变化触发，使用所有上游的最新值（适合多输入聚合场景） */
    COMBINE_LATEST = 'combineLatest',

    /** 主流触发，携带其他流的最新值（适合主从依赖场景） */
    WITH_LATEST_FROM = 'withLatestFrom'
}

// 统一的边类型
export interface IEdge extends Record<string, any> {
    id: string;
    from: string;
    to: string;

    // 数据映射
    fromProperty?: string;  // 支持嵌套属性路径,如 'currentItem.username'
    toProperty?: string;
    weight?: number;  // 多输入汇聚时的排序权重

    // 条件执行
    condition?: {
        property: string;
        value: any;
    };

    // 流式合并模式
    mode?: EdgeMode;
    isPrimary?: boolean;  // 标记主流（用于 WITH_LATEST_FROM 模式）
}

// 辅助函数：检查边是否有条件
export function hasCondition(edge: IEdge): boolean {
    return edge.condition !== undefined;
}

// 辅助函数：检查边是否传递数据
export function hasDataMapping(edge: IEdge): boolean {
    return edge.fromProperty !== undefined || edge.toProperty !== undefined;
}