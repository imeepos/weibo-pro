import * as fs from 'fs'
import * as path from 'path'
import { Lexer } from '../lexer'
import { Parser, WorkflowDefinition, NodeDefinition } from '../parser'

export class ModuleResolverError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModuleResolverError'
  }
}

export class ModuleResolver {
  private cache: Map<string, WorkflowDefinition> = new Map()
  private resolving: Set<string> = new Set()

  resolve(modulePath: string, basePath?: string): WorkflowDefinition {
    const absolutePath = this.resolvePath(modulePath, basePath)

    if (this.cache.has(absolutePath)) {
      return this.cache.get(absolutePath)!
    }

    if (!fs.existsSync(absolutePath)) {
      throw new ModuleResolverError(`Module not found: ${absolutePath}`)
    }

    const content = fs.readFileSync(absolutePath, 'utf-8')
    const lexer = new Lexer(content)
    const parser = new Parser(lexer.tokenize())
    const ast = parser.parse()

    this.cache.set(absolutePath, ast)
    return ast
  }

  resolveWithDependencies(modulePath: string, basePath?: string): WorkflowDefinition {
    const absolutePath = this.resolvePath(modulePath, basePath)

    if (this.resolving.has(absolutePath)) {
      throw new ModuleResolverError(`Circular dependency detected: ${absolutePath}`)
    }

    this.resolving.add(absolutePath)

    try {
      const ast = this.resolve(absolutePath)
      const resolvedModules = new Map<string, WorkflowDefinition>()

      // Resolve all imports
      if (ast.imports) {
        for (const imp of ast.imports) {
          const importedAst = this.resolveWithDependencies(imp.path, absolutePath)
          const alias = imp.alias || path.basename(imp.path, '.wf')
          resolvedModules.set(alias, importedAst)
        }
      }

      // Merge nodes from use declarations
      const mergedNodes: NodeDefinition[] = [...ast.nodes]

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

          // Clone node with new id
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
    } finally {
      this.resolving.delete(absolutePath)
    }
  }

  private resolvePath(modulePath: string, basePath?: string): string {
    if (path.isAbsolute(modulePath)) {
      return modulePath
    }

    if (basePath) {
      const baseDir = path.dirname(basePath)
      return path.resolve(baseDir, modulePath)
    }

    const resolved = path.resolve(modulePath)

    // Security check: prevent path traversal attacks
    const normalized = path.normalize(resolved)
    if (normalized.includes('..')) {
      throw new ModuleResolverError(`Path traversal detected: ${modulePath}`)
    }

    return resolved
  }

  clearCache(): void {
    this.cache.clear()
  }
}
