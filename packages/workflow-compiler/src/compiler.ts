import { Ast, WorkflowGraphAst } from '@sker/workflow'
import { Lexer, LexerError } from './lexer'
import { Parser, ParserError, WorkflowDefinition } from './parser'
import { CodeGenerator, CodeGenError, GeneratorOptions } from './generator'
import { WorkflowValidator } from './validator'
import { ModuleResolver, ModuleResolverError } from './resolver'

export interface CompilerOptions extends GeneratorOptions {
  basePath?: string
}

export interface CompilationError {
  message: string
  line: number
  column: number
  severity: 'error' | 'warning'
}

export interface CompilationResult {
  success: boolean
  workflowGraph?: WorkflowGraphAst
  dslAst?: WorkflowDefinition
  errors?: CompilationError[]
}

export class WorkflowDSLCompiler {
  private generator: CodeGenerator
  private validator: WorkflowValidator
  private resolver: ModuleResolver
  private basePath?: string

  constructor(options?: CompilerOptions) {
    this.generator = new CodeGenerator(options)
    this.validator = new WorkflowValidator()
    this.resolver = new ModuleResolver()
    this.basePath = options?.basePath
  }

  compile(dslCode: string): CompilationResult {
    try {
      // 1. Lexical analysis
      const lexer = new Lexer(dslCode)
      const tokens = lexer.tokenize()

      // 2. Parsing
      const parser = new Parser(tokens)
      let dslAst = parser.parse()

      // 3. Resolve imports and merge modules
      if (dslAst.imports && dslAst.imports.length > 0 && this.basePath) {
        dslAst = this.resolveModules(dslAst)
      }

      // 4. Semantic validation
      const validationResult = this.validator.validate(dslAst)
      if (!validationResult.valid) {
        return {
          success: false,
          dslAst,
          errors: validationResult.errors.map((e) => ({
            message: e.message,
            line: e.line ?? 0,
            column: e.column ?? 0,
            severity: e.severity,
          })),
        }
      }

      // 5. Code generation
      const workflowGraph = this.generator.generate(dslAst)

      return {
        success: true,
        workflowGraph,
        dslAst,
      }
    } catch (error) {
      return {
        success: false,
        errors: [this.formatError(error)],
      }
    }
  }

  private resolveModules(ast: WorkflowDefinition): WorkflowDefinition {
    const resolvedModules = new Map<string, WorkflowDefinition>()

    // Resolve all imports
    for (const imp of ast.imports!) {
      const importedAst = this.resolver.resolveWithDependencies(imp.path, this.basePath)
      const alias = imp.alias || imp.path.replace(/\.wf$/, '').split('/').pop()!
      resolvedModules.set(alias, importedAst)
    }

    // Merge nodes from use declarations
    const mergedNodes = [...ast.nodes]

    if (ast.uses) {
      for (const use of ast.uses) {
        const module = resolvedModules.get(use.moduleAlias)
        if (!module) {
          throw new ModuleResolverError(`Module alias not found: ${use.moduleAlias}`)
        }

        const sourceNode = module.nodes.find(n => n.id === use.nodeName)
        if (!sourceNode) {
          throw new ModuleResolverError(`Node not found in module ${use.moduleAlias}: ${use.nodeName}`)
        }

        mergedNodes.push({
          ...sourceNode,
          id: use.localAlias,
        })
      }
    }

    return {
      ...ast,
      nodes: mergedNodes,
    }
  }

  private formatError(error: unknown): CompilationError {
    if (error instanceof LexerError) {
      return {
        message: error.message,
        line: error.line,
        column: error.column,
        severity: 'error',
      }
    }

    if (error instanceof ParserError) {
      return {
        message: error.message,
        line: error.token.line,
        column: error.token.column,
        severity: 'error',
      }
    }

    if (error instanceof CodeGenError || error instanceof ModuleResolverError) {
      return {
        message: error.message,
        line: 0,
        column: 0,
        severity: 'error',
      }
    }

    return {
      message: error instanceof Error ? error.message : 'Unknown error',
      line: 0,
      column: 0,
      severity: 'error',
    }
  }
}

// Convenience function
export function compile(dslCode: string, options?: CompilerOptions): CompilationResult {
  const compiler = new WorkflowDSLCompiler(options)
  return compiler.compile(dslCode)
}
