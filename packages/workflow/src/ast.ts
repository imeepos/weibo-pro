import { Node, State } from "./decorator";
import { NodeEvent } from "./execution/events";
import { IAstStates, IEdge, INode, INodeInputMetadata, INodeOutputMetadata, INodeStateMetadata, INodeMetadata, CompiledNodeMetadata } from "./types";
import { generateId } from "./utils";
import { SerializedError } from "@sker/core";
import { BehaviorSubject, Observable } from 'rxjs';

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
    visit(ast: INode, input$: Observable<any>, ctx: WorkflowGraphAst): Observable<NodeEvent>;
}


export function astToLlmString(ast: Ast | INode) {
    return JSON.stringify({ id: ast.id, title: ast.name, summary: ast.description })
}

// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    count: number = 0;
    emitCount: number = 0;
    id: string = generateId();
    name?: string;
    description?: string;
    color?: string;
    collapsed?: boolean;
    width?: number;
    height?: number;
    state: IAstStates = 'pending';
    error: SerializedError | undefined;
    type!: string;
    position: { x: number; y: number } = { x: 0, y: 0 }
    parentId?: string
    metadata!: CompiledNodeMetadata

    toJSON(): Record<string, any> {
        const result: Record<string, any> = {};

        for (const key in this) {
            if (!Object.prototype.hasOwnProperty.call(this, key)) continue;

            const value = this[key];

            // 跳过 BehaviorSubject、Map（运行时状态）
            if (value instanceof BehaviorSubject || value instanceof Map) {
                continue;
            }

            result[key] = value;
        }

        return result;
    }
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

    // 结束节点
    @State({ title: '结束节点' })
    endNodeIds: string[] = [];

    // 边集合
    @State({ title: "边列表" })
    edges: IEdge[] = [];

    @State({ title: '工具节点ID列表' })
    toolNodeIds?: string[] = [];

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

    abortSignal?: AbortSignal

    get isGroup(): boolean {
        return this.isGroupNode === true
    }
}
export function createWorkflowGraphAst({ nodes = [], edges = [], id, state, name = 'Untitled Workflow', entryNodeIds = [], endNodeIds = [] }: { name?: string, nodes?: INode[], edges?: IEdge[], id?: string, state?: IAstStates, entryNodeIds?: string[], endNodeIds?: string[] } = {}) {
    const ast = new WorkflowGraphAst()
    ast.name = name
    ast.nodes = nodes;
    ast.edges = edges;
    ast.entryNodeIds = entryNodeIds;
    ast.endNodeIds = endNodeIds;
    if (id) ast.id = id;
    if (state) ast.state = state;
    return ast;
}

export function isWorkflowGraphAst(ast: any): ast is WorkflowGraphAst {
    return ast?.type === `WorkflowGraphAst`;
}

// 导出工具函数
export * from './ast-utils';
