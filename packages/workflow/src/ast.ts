import { Input, Node, Output } from "./decorator";
import { IAstStates, IEdge, INode, IControlEdge, isControlEdge } from "./types";
import { generateId } from "./utils";
import { ErrorSerializer, SerializedError } from "@sker/core";

export interface Visitor {
    visit(ast: Ast, ctx: any): Promise<any>;
}

// 抽象语法树的核心表达 - 状态与数据的统一
export abstract class Ast implements INode {
    id: string = generateId();
    state: IAstStates = 'pending';
    error: SerializedError | undefined;
    type!: string;
    position: { x: number; y: number } = { x: 0, y: 0 }

    /**
     * 优雅的错误赋值方法
     *
     * 优雅设计：
     * - 自动序列化任何类型的错误对象
     * - 保留完整的错误上下文
     * - 统一的错误处理接口
     */
    setError(error: unknown, includeStack = false): void {
      this.error = ErrorSerializer.serialize(error, includeStack);
    }

    /**
     * 提取最有用的错误信息（深层错误）
     */
    getDeepError(): SerializedError | undefined {
      return this.error
        ? ErrorSerializer.extractDeepestError(this.error)
        : undefined;
    }

    /**
     * 获取完整的错误描述
     */
    getErrorDescription(): string | undefined {
      return this.error ? ErrorSerializer.getFullDescription(this.error) : undefined;
    }
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

    /**
     * 视图窗口状态
     *
     * 优雅设计：
     * - 保存用户的缩放级别和视图位置
     * - 恢复工作流时用户回到之前的视图
     * - 提升用户体验的连续性
     */
    @Input({ title: '视图状态' })
    viewport?: { x: number; y: number; zoom: number };

    type: `WorkflowGraphAst` = `WorkflowGraphAst`

    /**
     * 添加节点
     *
     * 优雅设计：
     * - 自动验证节点ID唯一性
     * - 防止重复添加相同节点
     * - 返回this支持链式调用
     */
    addNode(node: INode): this {
        if (this.hasNode(node.id)) {
            throw new Error(`节点ID已存在: ${node.id}`)
        }
        this.nodes.push(node)
        return this
    }

    /**
     * 批量添加节点
     *
     * 优雅设计：
     * - 事务性操作，要么全部成功要么全部失败
     * - 预先验证所有节点ID，确保数据一致性
     */
    addNodes(nodes: INode[]): this {
        const duplicateIds = nodes.filter(node => this.hasNode(node.id)).map(node => node.id)
        if (duplicateIds.length > 0) {
            throw new Error(`以下节点ID已存在: ${duplicateIds.join(', ')}`)
        }
        this.nodes.push(...nodes)
        return this
    }

    /**
     * 根据ID获取节点
     *
     * 优雅设计：
     * - 严格的类型安全
     * - 清晰的语义化命名
     * - 返回undefined而非抛出异常，给调用者选择权
     */
    getNodeById<T extends INode = INode>(id: string): T | undefined {
        return this.nodes.find(node => node.id === id) as T | undefined
    }

    /**
     * 根据类型获取节点
     *
     * 优雅设计：
     * - 支持泛型，提供类型安全的节点查询
     * - 返回数组而非单个节点，语义清晰
     */
    getNodesByType<T extends INode = INode>(type: string): T[] {
        return this.nodes.filter(node => node.type === type) as T[]
    }

    /**
     * 检查节点是否存在
     *
     * 优雅设计：
     * - 语义化命名，一眼看懂用途
     * - 高效实现，避免不必要的遍历
     */
    hasNode(id: string): boolean {
        return this.nodes.some(node => node.id === id)
    }

    /**
     * 更新节点
     *
     * 优雅设计：
     * - 部分更新支持，无需提供完整节点对象
     * - 返回更新后的节点，便于链式操作
     * - 找不到节点时抛出明确错误
     */
    updateNode(id: string, updates: Partial<Omit<INode, 'id' | 'type'>>): INode {
        const node = this.getNodeById(id)
        if (!node) {
            throw new Error(`节点不存在: ${id}`)
        }
        Object.assign(node, updates)
        return node
    }

    /**
     * 更新节点位置
     *
     * 优雅设计：
     * - 专门的位置更新方法，语义清晰
     * - 支持同时更新x和y，或单独更新其中一个
     */
    updateNodePosition(id: string, position: { x?: number; y?: number }): INode {
        const node = this.getNodeById(id)
        if (!node) {
            throw new Error(`节点不存在: ${id}`)
        }
        if (position.x !== undefined) node.position.x = position.x
        if (position.y !== undefined) node.position.y = position.y
        return node
    }

    /**
     * 删除节点
     *
     * 优雅设计：
     * - 级联删除相关边，保持图的一致性
     * - 返回被删除的节点，便于撤销操作
     * - 找不到节点时返回undefined而非抛出异常
     */
    removeNode(id: string): INode | undefined {
        const nodeIndex = this.nodes.findIndex(node => node.id === id)
        if (nodeIndex === -1) {
            return undefined
        }
        const removedNode = this.nodes.splice(nodeIndex, 1)[0]

        // 级联删除相关边，保持图的一致性
        this.removeEdgesByNode(id)

        return removedNode
    }

    /**
     * 批量删除节点
     *
     * 优雅设计：
     * - 事务性操作，要么全部成功要么全部失败
     * - 返回被删除的节点列表，便于撤销操作
     */
    removeNodes(ids: string[]): INode[] {
        const removedNodes: INode[] = []

        for (const id of ids) {
            const node = this.removeNode(id)
            if (node) {
                removedNodes.push(node)
            }
        }

        return removedNodes
    }

    /**
     * 添加边
     *
     * 优雅设计：
     * - 自动验证边的端点节点存在性
     * - 防止重复添加相同边
     * - 支持数据流边和控制流边
     */
    addEdge(edge: IEdge): this {
        // 验证边的端点节点存在
        if (!this.hasNode(edge.from)) {
            throw new Error(`边的起始节点不存在: ${edge.from}`)
        }
        if (!this.hasNode(edge.to)) {
            throw new Error(`边的目标节点不存在: ${edge.to}`)
        }

        // 检查重复边（简化版本：检查相同from-to对）
        if (this.hasEdge(edge.from, edge.to)) {
            throw new Error(`边已存在: ${edge.from} -> ${edge.to}`)
        }

        this.edges.push(edge)
        return this
    }

    /**
     * 批量添加边
     *
     * 优雅设计：
     * - 事务性操作，要么全部成功要么全部失败
     * - 预先验证所有边的有效性
     */
    addEdges(edges: IEdge[]): this {
        for (const edge of edges) {
            // 验证边的端点节点存在
            if (!this.hasNode(edge.from)) {
                throw new Error(`边的起始节点不存在: ${edge.from}`)
            }
            if (!this.hasNode(edge.to)) {
                throw new Error(`边的目标节点不存在: ${edge.to}`)
            }
        }

        this.edges.push(...edges)
        return this
    }

    /**
     * 添加条件边
     *
     * 优雅设计：
     * - 专门的条件边添加方法，语义清晰
     * - 自动验证条件格式
     */
    addConditionalEdge(edge: IControlEdge): this {
        if (!edge.condition) {
            throw new Error('条件边必须包含condition属性')
        }
        return this.addEdge(edge)
    }

    /**
     * 根据ID获取边
     */
    getEdgeById(id: string): IEdge | undefined {
        return this.edges.find(edge => edge.id === id)
    }

    /**
     * 获取节点的所有相关边
     *
     * 优雅设计：
     * - 支持获取入边、出边或全部边
     * - 语义化参数，一眼看懂用途
     */
    getEdgesByNode(nodeId: string, direction: 'in' | 'out' | 'all' = 'all'): IEdge[] {
        return this.edges.filter(edge => {
            if (direction === 'in') return edge.to === nodeId
            if (direction === 'out') return edge.from === nodeId
            return edge.from === nodeId || edge.to === nodeId
        })
    }

    /**
     * 检查边是否存在
     *
     * 支持两种检查方式：
     * - 根据ID检查：hasEdge(edgeId)
     * - 根据端点检查：hasEdge(fromNodeId, toNodeId)
     */
    hasEdge(fromOrId: string, to?: string): boolean {
        if (to === undefined) {
            // 根据ID检查
            return this.edges.some(edge => edge.id === fromOrId)
        }
        // 根据端点检查
        return this.edges.some(edge => edge.from === fromOrId && edge.to === to)
    }

    /**
     * 更新边
     *
     * 优雅设计：
     * - 支持部分更新
     * - 自动验证更新后的边仍然有效
     */
    updateEdge(id: string, updates: Partial<Omit<IEdge, 'id'>>): IEdge {
        const edge = this.getEdgeById(id)
        if (!edge) {
            throw new Error(`边不存在: ${id}`)
        }

        // 如果更新了端点，验证新端点存在
        if (updates.from && !this.hasNode(updates.from)) {
            throw new Error(`边的起始节点不存在: ${updates.from}`)
        }
        if (updates.to && !this.hasNode(updates.to)) {
            throw new Error(`边的目标节点不存在: ${updates.to}`)
        }

        Object.assign(edge, updates)
        return edge
    }

    /**
     * 更新条件边的条件
     *
     * 专门用于更新条件边的条件，语义清晰
     */
    updateEdgeCondition(id: string, condition: IControlEdge['condition']): IEdge {
        const edge = this.getEdgeById(id)
        if (!edge) {
            throw new Error(`边不存在: ${id}`)
        }
        if (!isControlEdge(edge)) {
            throw new Error(`边不是条件边: ${id}`)
        }
        edge.condition = condition
        return edge
    }

    /**
     * 删除边
     *
     * 优雅设计：
     * - 返回被删除的边，便于撤销操作
     * - 找不到边时返回undefined而非抛出异常
     */
    removeEdge(id: string): IEdge | undefined {
        const edgeIndex = this.edges.findIndex(edge => edge.id === id)
        if (edgeIndex === -1) {
            return undefined
        }
        return this.edges.splice(edgeIndex, 1)[0]
    }

    /**
     * 删除节点的所有相关边
     *
     * 优雅设计：
     * - 支持删除入边、出边或全部边
     * - 返回被删除的边列表，便于撤销操作
     */
    removeEdgesByNode(nodeId: string, direction: 'in' | 'out' | 'all' = 'all'): IEdge[] {
        const removedEdges: IEdge[] = []

        this.edges = this.edges.filter(edge => {
            const shouldRemove =
                (direction === 'in' && edge.to === nodeId) ||
                (direction === 'out' && edge.from === nodeId) ||
                (direction === 'all' && (edge.from === nodeId || edge.to === nodeId))

            if (shouldRemove) {
                removedEdges.push(edge)
                return false // 从数组中移除
            }
            return true // 保留在数组中
        })

        return removedEdges
    }

    /**
     * 验证图的连通性
     *
     * 优雅设计：
     * - 检查是否存在孤立节点
     * - 检查边的端点是否都存在
     * - 返回详细的验证结果，便于调试
     */
    validateGraph(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // 检查边的端点是否存在
        for (const edge of this.edges) {
            if (!this.hasNode(edge.from)) {
                errors.push(`边的起始节点不存在: ${edge.from} (边ID: ${edge.id})`)
            }
            if (!this.hasNode(edge.to)) {
                errors.push(`边的目标节点不存在: ${edge.to} (边ID: ${edge.id})`)
            }
        }

        // 检查孤立节点（可选，根据业务需求）
        const connectedNodeIds = new Set<string>()
        for (const edge of this.edges) {
            connectedNodeIds.add(edge.from)
            connectedNodeIds.add(edge.to)
        }

        const isolatedNodes = this.nodes.filter(node => !connectedNodeIds.has(node.id))
        if (isolatedNodes.length > 0) {
            errors.push(`发现孤立节点: ${isolatedNodes.map(n => n.id).join(', ')}`)
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * 获取节点数量
     */
    getNodeCount(): number {
        return this.nodes.length
    }

    /**
     * 获取边数量
     */
    getEdgeCount(): number {
        return this.edges.length
    }

    /**
     * 清空所有节点和边
     *
     * 优雅设计：
     * - 返回清空前的状态，便于撤销操作
     * - 支持选择性清空（只清空节点、只清空边、或全部清空）
     */
    clearAll(options: { nodes?: boolean; edges?: boolean } = { nodes: true, edges: true }): { nodes: INode[]; edges: IEdge[] } {
        const previousState = {
            nodes: options.nodes ? [...this.nodes] : [],
            edges: options.edges ? [...this.edges] : []
        }

        if (options.nodes) {
            this.nodes = []
        }
        if (options.edges) {
            this.edges = []
        }

        return previousState
    }

    /**
     * 设置工作流名称
     *
     * 保留原始方法以保持向后兼容性
     */
    setName(name: string): this {
        this.name = name
        return this
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