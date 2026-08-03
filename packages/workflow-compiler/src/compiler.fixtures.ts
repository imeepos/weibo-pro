import { Ast, Node, Input, Output } from '@sker/workflow'

// Test nodes
@Node({ title: 'LoginNode' })
export class LoginNodeAst extends Ast {
  @Output() account?: string
}

@Node({ title: 'SearchNode' })
export class SearchNodeAst extends Ast {
  @Input() account?: string
  @Input() keyword?: string
  @Input() maxDelay?: number
  @Output() results?: string[]
}

@Node({ title: 'AnalyzerNode' })
export class AnalyzerNodeAst extends Ast {
  @Input() data?: string[]
  @Output() sentiment?: number
}

export const nodeRegistry = new Map<string, new (...args: any[]) => Ast>([
  ['LoginNodeAst', LoginNodeAst],
  ['SearchNodeAst', SearchNodeAst],
  ['AnalyzerNodeAst', AnalyzerNodeAst],
])
