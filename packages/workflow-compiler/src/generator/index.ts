import { Ast, WorkflowGraphAst, findNodeType, generateId, type IEdge } from '@sker/workflow'
import type {
  WorkflowDefinition,
  NodeDefinition,
  ConnectionDefinition,
  Expression,
  LiteralExpression,
  VariableExpression,
  BinaryExpression,
  ObjectExpression,
  ArrayExpression,
  BinaryOperator,
} from '../parser'

export class CodeGenError extends Error {
  constructor(message: string) {
    super(`CodeGen Error: ${message}`)
    this.name = 'CodeGenError'
  }
}

 
type AstConstructor = new (...args: any[]) => Ast

export interface GeneratorOptions {
  nodeRegistry?: Map<string, AstConstructor>
}

export class CodeGenerator {
  private variables = new Map<string, unknown>()
  private nodeRegistry: Map<string, AstConstructor>

  constructor(options?: GeneratorOptions) {
    this.nodeRegistry = options?.nodeRegistry ?? new Map()
  }

  generate(dslAst: WorkflowDefinition): WorkflowGraphAst {
    // Initialize variables
    this.variables.clear()
    if (dslAst.variables) {
      for (const v of dslAst.variables) {
        this.variables.set(v.name, this.evaluateExpression(v.value))
      }
    }

    // Create nodes
    const nodeMap = new Map<string, Ast>()
    const nodes: Ast[] = []

    for (const nodeDef of dslAst.nodes) {
      const node = this.createNode(nodeDef)
      nodeMap.set(nodeDef.id, node)
      nodes.push(node)
    }

    // Create edges
    const edges = dslAst.connections.map(conn => this.createEdge(conn, nodeMap))

    // Create workflow graph
    const graph = new WorkflowGraphAst()
    graph.id = generateId()
    graph.name = dslAst.name
    graph.nodes = nodes
    graph.edges = edges

    return graph
  }

  private createNode(nodeDef: NodeDefinition): Ast {
    const NodeClass = this.resolveNodeType(nodeDef.nodeType)
    const node = new NodeClass()

    node.id = nodeDef.id

    // Set inputs - directly assign to node properties
    if (nodeDef.inputs) {
      for (const [key, expr] of Object.entries(nodeDef.inputs)) {
        const value = this.evaluateExpression(expr)
        ;(node as unknown as Record<string, unknown>)[key] = value
      }
    }

    // Set position
    if (nodeDef.nodePosition) {
      node.position = nodeDef.nodePosition
    }

    return node
  }

  private resolveNodeType(nodeType: string): AstConstructor {
    // Check custom registry first
    if (this.nodeRegistry.has(nodeType)) {
      return this.nodeRegistry.get(nodeType)!
    }

    // Try to find from @sker/workflow
    const NodeClass = findNodeType(nodeType)
    if (NodeClass) {
      return NodeClass as AstConstructor
    }

    throw new CodeGenError(`Unknown node type: ${nodeType}`)
  }

  private createEdge(conn: ConnectionDefinition, nodeMap: Map<string, Ast>): IEdge {
    const sourceNode = nodeMap.get(conn.from.nodeId)
    const targetNode = nodeMap.get(conn.to.nodeId)

    if (!sourceNode) {
      throw new CodeGenError(`Unknown source node: ${conn.from.nodeId}`)
    }
    if (!targetNode) {
      throw new CodeGenError(`Unknown target node: ${conn.to.nodeId}`)
    }

    const edge: IEdge = {
      id: generateId(),
      from: sourceNode.id,
      fromProperty: conn.from.portName,
      to: targetNode.id,
      toProperty: conn.to.portName,
    }

    if (conn.condition) {
      edge.condition = {
        property: 'condition',
        value: this.evaluateExpression(conn.condition),
      }
    }

    return edge
  }

  evaluateExpression(expr: Expression): unknown {
    switch (expr.type) {
      case 'Literal':
        return (expr as LiteralExpression).value

      case 'Variable':
        return this.evaluateVariable(expr as VariableExpression)

      case 'BinaryExpression':
        return this.evaluateBinary(expr as BinaryExpression)

      case 'Object':
        return this.evaluateObject(expr as ObjectExpression)

      case 'Array':
        return this.evaluateArray(expr as ArrayExpression)

      default:
        throw new CodeGenError(`Unknown expression type: ${(expr as Expression).type}`)
    }
  }

  private evaluateVariable(expr: VariableExpression): unknown {
    if (!this.variables.has(expr.name)) {
      throw new CodeGenError(`Undefined variable: ${expr.name}`)
    }
    return this.variables.get(expr.name)
  }

  private evaluateBinary(expr: BinaryExpression): unknown {
    const left = this.evaluateExpression(expr.left)
    const right = this.evaluateExpression(expr.right)

    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new CodeGenError(`Binary operator ${expr.operator} requires number operands, got ${typeof left} and ${typeof right}`)
    }

    if (expr.operator === '/' && right === 0) {
      throw new CodeGenError('Division by zero')
    }

    const ops: Record<BinaryOperator, (a: number, b: number) => unknown> = {
      '+': (a, b) => a + b,
      '-': (a, b) => a - b,
      '*': (a, b) => a * b,
      '/': (a, b) => a / b,
      '>': (a, b) => a > b,
      '<': (a, b) => a < b,
      '>=': (a, b) => a >= b,
      '<=': (a, b) => a <= b,
      '==': (a, b) => a === b,
      '!=': (a, b) => a !== b,
    }

    return ops[expr.operator](left, right)
  }

  private evaluateObject(expr: ObjectExpression): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(expr.properties)) {
      result[key] = this.evaluateExpression(value)
    }
    return result
  }

  private evaluateArray(expr: ArrayExpression): unknown[] {
    return expr.elements.map(e => this.evaluateExpression(e))
  }
}
