import { Lexer } from '../lexer'
import { Parser } from '../parser'
import { CodeGenerator } from './index'
import { Ast } from '@sker/workflow'

// Mock node for testing - without decorators to avoid TS5.0+ decorator issues
export class TestNodeAst extends Ast {
  keyword?: string;
  limit?: number;
  result?: string;
  type = 'TestNodeAst' as const;
}

export class AnotherNodeAst extends Ast {
  input?: string;
  output?: string;
  type = 'AnotherNodeAst' as const;
}

export type NodeRegistry = Map<string, new (...args: any[]) => Ast>

export function makeRegistry(...entries: (new (...args: any[]) => Ast)[]): NodeRegistry {
  return new Map(entries.map((node) => [node.name, node]))
}

export function createTestRegistry(): NodeRegistry {
  return makeRegistry(TestNodeAst, AnotherNodeAst)
}

export const compile = (code: string, options?: { nodeRegistry?: NodeRegistry }) => {
  const lexer = new Lexer(code)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens)
  const ast = parser.parse()
  const generator = new CodeGenerator(options)
  return generator.generate(ast)
}
