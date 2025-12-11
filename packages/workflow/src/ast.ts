import { Node, State } from "./decorator";
import { IAstStates, IEdge, INode, INodeInputMetadata, INodeOutputMetadata, INodeStateMetadata, INodeMetadata } from "./types";
import { generateId } from "./utils";
import { SerializedError } from "@sker/core";
import { Observable } from 'rxjs'

export interface DynamicOutput {
    property: string      // 属性名（如 output_case4）
    title: string         // 显示标题
    description?: string  // 端口描述
    type?: string         // 数据类型
    condition: string     // 条件表达式
}

export interface DynamicInput {
    property: string      // 属性名（如 input_custom1）
    title: string         // 显示标题
    description?: string  // 端口描述
    type?: string         // 数据类型（'string' | 'number' | 'boolean' 等）
}

export interface Visitor {
    // 每一次执行 返回最新的 Ast
    // 一定要遵守： 每一次状态变更都需要发射一个新的 INode 给外部
    visit(ast: INode, ctx: any): Observable<INode>;
}

// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    // 运行次数
    count: number = 0;
    // 发射次数
    emitCount: number = 0;
    // 唯一标识
    id: string = generateId();
    // 标题
    name?: string;
    // 简介
    description?: string;
    // 自定义颜色
    color?: string;
    // 折叠
    collapsed?: boolean;
    // 宽度
    width?: number;
    // 高度
    height?: number;
    // 状态
    state: IAstStates = 'pending';
    // 错误信息
    error: SerializedError | undefined;
    // 类型-序列化的关键
    type!: string;
    // 画布中的位置信息
    position: { x: number; y: number } = { x: 0, y: 0 }
    // 父节点ID（用于分组）
    parentId?: string

    /**
     * 编译后的元数据（由 Compiler 生成）
     *
     * 优雅设计：
     * - 在运行时通过 Compiler.compile() 固化装饰器元数据
     * - 自包含，无需依赖装饰器系统
     * - 支持用户自定义修改节点行为
     */
    metadata!: {
        class: INodeMetadata
        inputs: INodeInputMetadata[]
        outputs: INodeOutputMetadata[]
        states: INodeStateMetadata[]
    }

    // 动态输出配置（用于支持运行时添加输出端口）
    dynamicOutputs?: DynamicOutput[]

    // 动态输入配置（用于支持运行时添加输入端口）
    dynamicInputs?: DynamicInput[]

    // 自定义端口标签 { propertyKey: customLabel }
    portLabels?: Record<string, string>

    // 自定义属性（用户可动态添加任意属性）
    customProperties?: Record<string, any>
}

@Node({ title: "工作流", type: 'basic' })
export class WorkflowGraphAst extends Ast {
    @State({ title: "名称", type: 'text' })
    name: string | undefined;

    // 节点列表
    @State({ title: "节点列表" })
    nodes: INode[] = [];

    // 开始节点
    @State({ title: '开始节点' })
    entryNodeIds: string[] = [];

    // 边集合
    @State({ title: "边列表" })
    edges: IEdge[] = [];

    /**
     * 视图窗口状态
     *
     * 优雅设计：
     * - 保存用户的缩放级别和视图位置
     * - 恢复工作流时用户回到之前的视图
     * - 提升用户体验的连续性
     */
    @State({ title: '视图状态' })
    viewport?: { x: number; y: number; zoom: number };

    @State({ title: '折叠状态' })
    collapsed?: boolean = false;

    @State({ title: '标签' })
    tags?: string[] = [];

    // 显式标记是否为分组节点
    @State({ title: '分组标记' })
    isGroupNode?: boolean = false;

    type: `WorkflowGraphAst` = `WorkflowGraphAst`

    /**
     * 工作流取消信号
     *
     * 优雅设计：
     * - 使用标准 AbortSignal API
     * - 支持取消长时间运行的操作
     * - Handler 可选择性监听并响应取消
     */
    abortSignal?: AbortSignal

    /**
     * 判断是否为分组节点
     */
    get isGroup(): boolean {
        return this.isGroupNode === true
    }
}
export function createWorkflowGraphAst({ nodes = [], edges = [], id, state, name = 'Untitled Workflow' }: { name?: string, nodes?: INode[], edges?: IEdge[], id?: string, state?: IAstStates } = {}) {
    const ast = new WorkflowGraphAst()
    ast.name = name
    ast.nodes = nodes;
    ast.edges = edges;
    if (id) ast.id = id;
    if (state) ast.state = state;
    return ast;
}

export function isWorkflowGraphAst(ast: any): ast is WorkflowGraphAst {
    return ast?.type === `WorkflowGraphAst`;
}

// 导出工具函数
export * from './ast-utils';
