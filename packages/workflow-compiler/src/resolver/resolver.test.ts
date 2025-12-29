import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Lexer, TokenType } from '../lexer'
import { Parser } from '../parser'
import { ModuleResolver } from './index'

describe('Module System - Phase 5', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('Lexer - Import/Use/As tokens', () => {
    it('should tokenize import keyword', () => {
      const lexer = new Lexer('import')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.IMPORT)
    })

    it('should tokenize use keyword', () => {
      const lexer = new Lexer('use')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.USE)
    })

    it('should tokenize as keyword', () => {
      const lexer = new Lexer('as')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.AS)
    })

    it('should tokenize full import statement', () => {
      const lexer = new Lexer('import "./common.wf" as common')
      const tokens = lexer.tokenize()
      expect(tokens[0].type).toBe(TokenType.IMPORT)
      expect(tokens[1].type).toBe(TokenType.STRING)
      expect(tokens[1].value).toBe('./common.wf')
      expect(tokens[2].type).toBe(TokenType.AS)
      expect(tokens[3].type).toBe(TokenType.IDENTIFIER)
      expect(tokens[3].value).toBe('common')
    })
  })

  describe('Parser - Import declarations', () => {
    it('should parse import declaration with alias', () => {
      const code = `
        import "./common.wf" as common
        workflow "test" {
          node start {
            type: StartAst
          }
        }
      `
      const lexer = new Lexer(code)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      expect(ast.imports).toBeDefined()
      expect(ast.imports).toHaveLength(1)
      expect(ast.imports![0].path).toBe('./common.wf')
      expect(ast.imports![0].alias).toBe('common')
    })

    it('should parse import declaration without alias', () => {
      const code = `
        import "./common.wf"
        workflow "test" {
          node start {
            type: StartAst
          }
        }
      `
      const lexer = new Lexer(code)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      expect(ast.imports).toBeDefined()
      expect(ast.imports).toHaveLength(1)
      expect(ast.imports![0].path).toBe('./common.wf')
      expect(ast.imports![0].alias).toBeUndefined()
    })

    it('should parse multiple imports', () => {
      const code = `
        import "./common.wf" as common
        import "./utils.wf" as utils
        workflow "test" {
          node start {
            type: StartAst
          }
        }
      `
      const lexer = new Lexer(code)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      expect(ast.imports).toHaveLength(2)
      expect(ast.imports![0].alias).toBe('common')
      expect(ast.imports![1].alias).toBe('utils')
    })

    it('should parse use declaration', () => {
      const code = `
        import "./common.wf" as common
        workflow "test" {
          use common.LoginNode as login
          node search {
            type: SearchAst
          }
        }
      `
      const lexer = new Lexer(code)
      const parser = new Parser(lexer.tokenize())
      const ast = parser.parse()

      expect(ast.uses).toBeDefined()
      expect(ast.uses).toHaveLength(1)
      expect(ast.uses![0].moduleAlias).toBe('common')
      expect(ast.uses![0].nodeName).toBe('LoginNode')
      expect(ast.uses![0].localAlias).toBe('login')
    })
  })

  describe('ModuleResolver', () => {
    it('should resolve and parse a module file', () => {
      const commonWf = `
        workflow "common" {
          node CommonLogin {
            type: WeiboLoginAst
            position: { x: 100, y: 100 }
          }
        }
      `
      const filePath = path.join(tempDir, 'common.wf')
      fs.writeFileSync(filePath, commonWf)

      const resolver = new ModuleResolver()
      const result = resolver.resolve(filePath)

      expect(result.name).toBe('common')
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].id).toBe('CommonLogin')
    })

    it('should resolve relative path from base path', () => {
      const commonWf = `
        workflow "common" {
          node CommonLogin {
            type: WeiboLoginAst
          }
        }
      `
      const subDir = path.join(tempDir, 'sub')
      fs.mkdirSync(subDir)
      fs.writeFileSync(path.join(tempDir, 'common.wf'), commonWf)

      const resolver = new ModuleResolver()
      const basePath = path.join(subDir, 'main.wf')
      const result = resolver.resolve('../common.wf', basePath)

      expect(result.name).toBe('common')
    })

    it('should cache resolved modules', () => {
      const commonWf = `
        workflow "common" {
          node CommonLogin {
            type: WeiboLoginAst
          }
        }
      `
      const filePath = path.join(tempDir, 'common.wf')
      fs.writeFileSync(filePath, commonWf)

      const resolver = new ModuleResolver()
      const result1 = resolver.resolve(filePath)
      const result2 = resolver.resolve(filePath)

      expect(result1).toBe(result2) // Same reference (cached)
    })

    it('should throw error for non-existent file', () => {
      const resolver = new ModuleResolver()
      expect(() => resolver.resolve('/non/existent/file.wf')).toThrow()
    })

    it('should detect circular dependencies', () => {
      // a.wf imports b.wf, b.wf imports a.wf
      const aWf = `
        import "./b.wf" as b
        workflow "a" {
          node NodeA { type: TypeA }
        }
      `
      const bWf = `
        import "./a.wf" as a
        workflow "b" {
          node NodeB { type: TypeB }
        }
      `
      fs.writeFileSync(path.join(tempDir, 'a.wf'), aWf)
      fs.writeFileSync(path.join(tempDir, 'b.wf'), bWf)

      const resolver = new ModuleResolver()
      expect(() => resolver.resolveWithDependencies(path.join(tempDir, 'a.wf'))).toThrow(/circular/i)
    })
  })

  describe('Module merging', () => {
    it('should merge imported nodes via use declaration', () => {
      const commonWf = `
        workflow "common" {
          node CommonLogin {
            type: WeiboLoginAst
            position: { x: 100, y: 100 }
          }
        }
      `
      const mainWf = `
        import "./common.wf" as common
        workflow "main" {
          use common.CommonLogin as login
          node search {
            type: SearchAst
          }
          login.output -> search.input
        }
      `
      fs.writeFileSync(path.join(tempDir, 'common.wf'), commonWf)
      fs.writeFileSync(path.join(tempDir, 'main.wf'), mainWf)

      const resolver = new ModuleResolver()
      const result = resolver.resolveWithDependencies(path.join(tempDir, 'main.wf'))

      // The merged workflow should have both nodes
      expect(result.nodes).toHaveLength(2)
      expect(result.nodes.find(n => n.id === 'login')).toBeDefined()
      expect(result.nodes.find(n => n.id === 'search')).toBeDefined()
    })
  })
})
