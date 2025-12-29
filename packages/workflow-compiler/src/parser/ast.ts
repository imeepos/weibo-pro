export interface SourcePosition {
  line: number
  column: number
}

export interface WorkflowDSLNode {
  type: string
  position?: SourcePosition
}

export interface WorkflowDefinition extends WorkflowDSLNode {
  type: 'Workflow'
  name: string
  imports?: ImportDeclaration[]
  uses?: UseDeclaration[]
  variables?: VariableDeclaration[]
  nodes: NodeDefinition[]
  connections: ConnectionDefinition[]
}

export interface ImportDeclaration extends WorkflowDSLNode {
  type: 'ImportDeclaration'
  path: string
  alias?: string
}

export interface UseDeclaration extends WorkflowDSLNode {
  type: 'UseDeclaration'
  moduleAlias: string
  nodeName: string
  localAlias: string
}

export interface VariableDeclaration extends WorkflowDSLNode {
  type: 'VariableDeclaration'
  name: string
  value: Expression
}

export interface NodeDefinition extends WorkflowDSLNode {
  type: 'Node'
  id: string
  nodeType: string
  inputs?: Record<string, Expression>
  nodePosition?: { x: number; y: number }
}

export interface ConnectionDefinition extends WorkflowDSLNode {
  type: 'Connection'
  from: PortReference
  to: PortReference
  condition?: Expression
}

export interface PortReference {
  nodeId: string
  portName: string
}

// Expressions
export type Expression =
  | LiteralExpression
  | VariableExpression
  | BinaryExpression
  | ObjectExpression
  | ArrayExpression

export interface LiteralExpression extends WorkflowDSLNode {
  type: 'Literal'
  value: string | number | boolean | null
}

export interface VariableExpression extends WorkflowDSLNode {
  type: 'Variable'
  name: string
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '>' | '<' | '>=' | '<=' | '==' | '!='

export interface BinaryExpression extends WorkflowDSLNode {
  type: 'BinaryExpression'
  operator: BinaryOperator
  left: Expression
  right: Expression
}

export interface ObjectExpression extends WorkflowDSLNode {
  type: 'Object'
  properties: Record<string, Expression>
}

export interface ArrayExpression extends WorkflowDSLNode {
  type: 'Array'
  elements: Expression[]
}
