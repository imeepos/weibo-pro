// 抽象语法树的核心表达 - 万物皆为状态
// - pending: 等待执行
// - running: 执行中但未产生输出
// - emitting: 正在发射数据（触发下游）
// - success: 执行完成（不触发下游）
// - fail: 执行失败
export type IAstStates = `pending` | `running` | `emitting` | `success` | `fail`;

// 状态数据的基础约束
export interface INode extends Record<string, any> {
     // 标题
    name?: string;
    // 简介
    description?: string;
    // 自定义颜色
    state: IAstStates;
    count: number;
    id: string;
    type: string;
    error: Error | undefined;
    position: { x: number; y: number };
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