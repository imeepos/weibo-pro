// 抽象语法树的核心表达 - 万物皆为状态
export type IAstStates = `pending` | `running` | `success` | `fail`;

// 状态数据的基础约束
export interface INode extends Record<string, any> {
    state: IAstStates;
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
// 数据流边 - 纯粹的数据传递
export interface IDataEdge extends Record<string, any> {
    id: string;
    type: 'data',
    from: string;
    fromProperty?: string;  // 支持嵌套属性路径,如 'currentItem.username' 或 'data.user.profile.name'
    to: string;
    toProperty?: string;
    weight?: number;  // 多输入汇聚时的排序权重,值越小优先级越高,未指定时按边定义顺序排列

    // 流式合并模式
    mode?: EdgeMode;  // 上游如何触发下游执行（默认 MERGE）
    isPrimary?: boolean;  // 标记主流（用于 WITH_LATEST_FROM 模式）
}

// 控制流边 - 纯粹的执行依赖
export interface IControlEdge extends Record<string, any> {
    id: string;
    type: 'control',
    from: string;
    to: string;
    condition?: {
        property: string;
        value: any;
    };
}

// 统一边类型
export type IEdge = IDataEdge | IControlEdge;

// 类型守卫函数
export function isDataEdge(edge: IEdge): edge is IDataEdge {
    return 'fromProperty' in edge || 'toProperty' in edge || !('condition' in edge);
}

export function isControlEdge(edge: IEdge): edge is IControlEdge {
    return 'condition' in edge && edge.condition !== undefined;
}