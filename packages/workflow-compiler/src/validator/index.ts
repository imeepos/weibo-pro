import {
  WorkflowDefinition,
  NodeDefinition,
  ConnectionDefinition,
  Expression,
} from '../parser'

export interface ValidationError {
  message: string
  line?: number
  column?: number
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export class WorkflowValidator {
  private errors: ValidationError[] = []
  private declaredVariables: Set<string> = new Set()
  private nodeIds: Set<string> = new Set()

  validate(ast: WorkflowDefinition): ValidationResult {
    this.errors = []
    this.declaredVariables = new Set()
    this.nodeIds = new Set()

    // Collect declared variables
    if (ast.variables) {
      for (const v of ast.variables) {
        this.declaredVariables.add(v.name)
      }
    }

    // Validate nodes
    this.validateNodes(ast.nodes)

    // Validate connections
    this.validateConnections(ast.connections)

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
    }
  }

  private validateNodes(nodes: NodeDefinition[]): void {
    for (const node of nodes) {
      // Check duplicate IDs
      if (this.nodeIds.has(node.id)) {
        this.addError(`Duplicate node ID: '${node.id}'`, node.position)
      } else {
        this.nodeIds.add(node.id)
      }

      // Check variable references in inputs
      if (node.inputs) {
        for (const expr of Object.values(node.inputs)) {
          this.validateExpression(expr)
        }
      }
    }
  }

  private validateConnections(connections: ConnectionDefinition[]): void {
    for (const conn of connections) {
      // Check source node exists
      if (!this.nodeIds.has(conn.from.nodeId)) {
        this.addError(`Connection references non-existent node: '${conn.from.nodeId}'`, conn.position)
      }

      // Check target node exists
      if (!this.nodeIds.has(conn.to.nodeId)) {
        this.addError(`Connection references non-existent node: '${conn.to.nodeId}'`, conn.position)
      }

      // Check variables in condition
      if (conn.condition) {
        this.validateExpression(conn.condition)
      }
    }
  }

  private validateExpression(expr: Expression): void {
    switch (expr.type) {
      case 'Variable':
        if (!this.declaredVariables.has(expr.name)) {
          this.addError(`Undeclared variable: '$${expr.name}'`, expr.position)
        }
        break
      case 'BinaryExpression':
        this.validateExpression(expr.left)
        this.validateExpression(expr.right)
        break
      case 'Object':
        for (const val of Object.values(expr.properties)) {
          this.validateExpression(val)
        }
        break
      case 'Array':
        for (const el of expr.elements) {
          this.validateExpression(el)
        }
        break
    }
  }

  private addError(message: string, position?: { line: number; column: number }): void {
    this.errors.push({
      message,
      line: position?.line,
      column: position?.column,
      severity: 'error',
    })
  }
}
