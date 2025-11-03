import { Input, Node, Output } from "./decorator";
import { IAstStates, IEdge, INode } from "./types";
import { generateId } from "./utils";
export interface Visitor {
    visit(ast: Ast, ctx: any): Promise<any>;
}
// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    id: string = generateId();
    state: IAstStates = 'pending';
    error: Error | undefined;
    type!: string;
}

@Node({ title: "工作流图" })
export class WorkflowGraphAst extends Ast {
    @Input({ title: "名称", type: 'text' })
    name: string | undefined;

    @Input({ title: "节点列表" })
    nodes: INode[] = [];
    @Input({ title: "边列表" })
    edges: IEdge[] = [];

    @Input({ title: '上下文' })
    ctx: any = {};

    @Output({ title: '执行结果' })
    results: any[] = [];

    type: `WorkflowGraphAst` = `WorkflowGraphAst`
    addNode(node: INode) {
        this.nodes.push(node)
        return this;
    }
    addEdge(edge: IEdge) {
        this.edges.push(edge)
        return this;
    }
    addConditionalEdge(edge: IEdge) {
        this.edges.push(edge)
        return this;
    }
    setName(name: string) {
        this.name = name;
        return this;
    }
}
export function createWorkflowGraphAst({ nodes, edges, id, state, name }: { name: string, nodes: INode[], edges: IEdge[], id?: string, state?: IAstStates }) {
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

@Node({ title: "数组迭代器" })
export class ArrayIteratorAst extends Ast {
    @Input({ title: "数组" }) array: any[] = [];
    @Input({ title: "当前索引" }) currentIndex: number = 0;

    @Output({ title: "当前项" }) currentItem: any;
    @Output({ title: "是否有下一项" }) hasNext: boolean = false;
    @Output({ title: "是否完成" }) isDone: boolean = true;

    type: `ArrayIteratorAst` = 'ArrayIteratorAst' as const;
}