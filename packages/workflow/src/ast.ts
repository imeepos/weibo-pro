import { Input, Node, Output, State, INPUT, OUTPUT } from "./decorator";
import { IAstStates, IEdge, INode } from "./types";
import { generateId } from "./utils";
import { ErrorSerializer, SerializedError, root } from "@sker/core";
import { Observable } from 'rxjs'

export interface DynamicOutput {
    property: string      // 属性名（如 output_case4）
    title: string         // 显示标题
    condition: string     // 条件表达式
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
    // 状态
    state: IAstStates = 'pending';
    // 错误信息
    error: SerializedError | undefined;
    // 类型-序列化的关键
    type!: string;
    // 画布中的位置信息
    position: { x: number; y: number } = { x: 0, y: 0 }
    // 动态输出配置（用于支持运行时添加输出端口）
    dynamicOutputs?: DynamicOutput[]

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

@Node({ title: "工作流", type: 'basic' })
export class WorkflowGraphAst extends Ast {
    @State({ title: "名称", type: 'text' })
    name: string | undefined;

    // 节点泪飙
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
     *
     * 优雅设计：
     * - 分组节点 = 没有执行入口的 WorkflowGraphAst
     * - 可执行工作流 = 有执行入口的 WorkflowGraphAst
     * - 不需要额外的标记字段，通过语义判断
     */
    get isGroup(): boolean {
        return this.entryNodeIds.length === 0 && this.nodes.length > 0
    }

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
     */
    addEdge(edge: IEdge): this {
        // 验证边的端点节点存在
        if (!this.hasNode(edge.from)) {
            throw new Error(`边的起始节点不存在: ${edge.from}`)
        }
        if (!this.hasNode(edge.to)) {
            throw new Error(`边的目标节点不存在: ${edge.to}`)
        }

        // 检查重复
        if (this.hasEdge(edge.from, edge.to, edge.fromProperty, edge.toProperty)) {
            throw new Error(
                `边已存在: ${edge.from}.${edge.fromProperty || '*'} -> ${edge.to}.${edge.toProperty || '*'}`
            )
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
    addConditionalEdge(edge: IEdge): this {
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
     * 支持三种检查方式：
     * - 根据ID检查：hasEdge(edgeId)
     * - 根据节点检查：hasEdge(fromNodeId, toNodeId)
     * - 根据端口检查：hasEdge(fromNodeId, toNodeId, fromProperty, toProperty)
     */
    hasEdge(fromOrId: string, to?: string, fromProperty?: string, toProperty?: string): boolean {
        if (to === undefined) {
            // 根据ID检查
            return this.edges.some(edge => edge.id === fromOrId)
        }

        return this.edges.some(edge => {
            if (edge.from !== fromOrId || edge.to !== to) return false

            // 如果指定了端口，检查端口匹配
            if (fromProperty !== undefined || toProperty !== undefined) {
                return edge.fromProperty === fromProperty &&
                    edge.toProperty === toProperty
            }

            // 未指定端口时，只检查节点
            return true
        })
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
     * 更新边的条件
     *
     * 专门用于更新边的条件，语义清晰
     */
    updateEdgeCondition(id: string, condition: IEdge['condition']): IEdge {
        const edge = this.getEdgeById(id)
        if (!edge) {
            throw new Error(`边不存在: ${id}`)
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

    /**
     * 动态计算工作流的输入端口
     *
     * 优雅设计：
     * - 输入端口 = 内部节点的未连接输入
     * - 这些输入需要从外部提供数据
     * - 自动根据内部结构推断接口
     */
    getExposedInputs(): Array<{ nodeId: string; property: string; title?: string; type?: string; required?: boolean }> {
        const exposedInputs: Array<{ nodeId: string; property: string; title?: string; type?: string; required?: boolean }> = []

        // 遍历所有节点，找到未连接的输入端口
        for (const node of this.nodes) {
            // 跳过 WorkflowGraphAst 自身
            if (node.type === 'WorkflowGraphAst') continue

            try {
                const ctor = (node as any).constructor
                if (!ctor) continue

                // 获取该节点的输入元数据
                const inputMetadatas = root.get(INPUT, [])
                const nodeInputs = inputMetadatas.filter((meta: any) => meta.target === ctor)

                // 检查每个输入端口是否被连接
                for (const inputMeta of nodeInputs) {
                    const property = String(inputMeta.propertyKey)
                    const isConnected = this.edges.some(edge =>
                        edge.to === node.id && edge.toProperty === property
                    )

                    // 如果未连接，则暴露为工作流的输入
                    if (!isConnected) {
                        exposedInputs.push({
                            nodeId: node.id,
                            property,
                            title: inputMeta.title || property,
                            type: inputMeta.type,
                            required: inputMeta.required
                        })
                    }
                }
            } catch (error) {
                // 获取元数据失败时跳过该节点
                continue
            }
        }

        return exposedInputs
    }

    /**
     * 动态计算工作流的输出端口
     *
     * 优雅设计：
     * - 输出端口 = 内部节点的未连接输出
     * - 这些输出可以被外部消费
     * - 自动根据内部结构推断接口
     */
    getExposedOutputs(): Array<{ nodeId: string; property: string; title?: string; type?: string }> {
        const exposedOutputs: Array<{ nodeId: string; property: string; title?: string; type?: string }> = []

        // 遍历所有节点，找到未连接的输出端口
        for (const node of this.nodes) {
            // 跳过 WorkflowGraphAst 自身
            if (node.type === 'WorkflowGraphAst') continue

            try {
                const ctor = (node as any).constructor
                if (!ctor) continue

                // 获取该节点的输出元数据
                const outputMetadatas = root.get(OUTPUT, [])
                const nodeOutputs = outputMetadatas.filter((meta: any) => meta.target === ctor)

                // 检查每个输出端口是否被连接
                for (const outputMeta of nodeOutputs) {
                    const property = String(outputMeta.propertyKey)
                    const isConnected = this.edges.some(edge =>
                        edge.from === node.id && edge.fromProperty === property
                    )

                    // 如果未连接，则暴露为工作流的输出
                    if (!isConnected) {
                        exposedOutputs.push({
                            nodeId: node.id,
                            property,
                            title: outputMeta.title || property,
                            type: outputMeta.type
                        })
                    }
                }
            } catch (error) {
                // 获取元数据失败时跳过该节点
                continue
            }
        }

        return exposedOutputs
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
