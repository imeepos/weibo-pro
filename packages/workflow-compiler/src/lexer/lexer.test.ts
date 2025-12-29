import { describe, it, expect } from 'vitest'
import { Lexer, TokenType, LexerError } from './index'

describe('Lexer', () => {
  describe('basic tokens', () => {
    it('should tokenize empty workflow', () => {
      const lexer = new Lexer('workflow "test" {}')
      const tokens = lexer.tokenize()

      expect(tokens).toHaveLength(5)
      expect(tokens[0]).toMatchObject({ type: TokenType.WORKFLOW, value: 'workflow' })
      expect(tokens[1]).toMatchObject({ type: TokenType.STRING, value: 'test' })
      expect(tokens[2]).toMatchObject({ type: TokenType.LBRACE })
      expect(tokens[3]).toMatchObject({ type: TokenType.RBRACE })
      expect(tokens[4]).toMatchObject({ type: TokenType.EOF })
    })

    it('should tokenize node definition', () => {
      const lexer = new Lexer('node login { type: WeiboLoginAst }')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.NODE, value: 'node' })
      expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'login' })
      expect(tokens[2]).toMatchObject({ type: TokenType.LBRACE })
      expect(tokens[3]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'type' })
      expect(tokens[4]).toMatchObject({ type: TokenType.COLON })
      expect(tokens[5]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'WeiboLoginAst' })
    })

    it('should tokenize connection', () => {
      const lexer = new Lexer('login.account -> search.account')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'login' })
      expect(tokens[1]).toMatchObject({ type: TokenType.DOT })
      expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'account' })
      expect(tokens[3]).toMatchObject({ type: TokenType.ARROW, value: '->' })
      expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'search' })
      expect(tokens[5]).toMatchObject({ type: TokenType.DOT })
      expect(tokens[6]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'account' })
    })
  })

  describe('literals', () => {
    it('should tokenize strings with escape sequences', () => {
      const lexer = new Lexer('"hello\\nworld"')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: 'hello\nworld' })
    })

    it('should tokenize single-quoted strings', () => {
      const lexer = new Lexer("'test'")
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: 'test' })
    })

    it('should tokenize integers', () => {
      const lexer = new Lexer('42')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: 42 })
    })

    it('should tokenize floats', () => {
      const lexer = new Lexer('3.14')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: 3.14 })
    })

    it('should tokenize negative numbers', () => {
      const lexer = new Lexer('-42 -3.14')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: -42 })
      expect(tokens[1]).toMatchObject({ type: TokenType.NUMBER, value: -3.14 })
    })

    it('should distinguish minus operator from negative number', () => {
      const lexer = new Lexer('5 - 3')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: 5 })
      expect(tokens[1]).toMatchObject({ type: TokenType.MINUS })
      expect(tokens[2]).toMatchObject({ type: TokenType.NUMBER, value: 3 })
    })

    it('should tokenize booleans', () => {
      const lexer = new Lexer('true false')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.BOOLEAN, value: true })
      expect(tokens[1]).toMatchObject({ type: TokenType.BOOLEAN, value: false })
    })

    it('should tokenize null', () => {
      const lexer = new Lexer('null')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.NULL, value: null })
    })
  })

  describe('operators', () => {
    it('should tokenize comparison operators', () => {
      const lexer = new Lexer('> < >= <= == !=')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.GT })
      expect(tokens[1]).toMatchObject({ type: TokenType.LT })
      expect(tokens[2]).toMatchObject({ type: TokenType.GTE })
      expect(tokens[3]).toMatchObject({ type: TokenType.LTE })
      expect(tokens[4]).toMatchObject({ type: TokenType.EQ })
      expect(tokens[5]).toMatchObject({ type: TokenType.NEQ })
    })

    it('should tokenize arithmetic operators', () => {
      const lexer = new Lexer('+ - * /')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.PLUS })
      expect(tokens[1]).toMatchObject({ type: TokenType.MINUS })
      expect(tokens[2]).toMatchObject({ type: TokenType.MULTIPLY })
      expect(tokens[3]).toMatchObject({ type: TokenType.DIVIDE })
    })
  })

  describe('comments', () => {
    it('should skip single-line comments', () => {
      const lexer = new Lexer('// comment\nworkflow "test" {}')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.WORKFLOW })
    })

    it('should skip multi-line comments', () => {
      const lexer = new Lexer('/* comment */workflow "test" {}')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.WORKFLOW })
    })
  })

  describe('position tracking', () => {
    it('should track line and column', () => {
      const lexer = new Lexer('workflow\n  "test"')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ line: 1, column: 1 })
      expect(tokens[1]).toMatchObject({ line: 2, column: 3 })
    })
  })

  describe('error handling', () => {
    it('should throw on unterminated string', () => {
      expect(() => new Lexer('"unterminated').tokenize()).toThrow(LexerError)
      expect(() => new Lexer('"unterminated').tokenize()).toThrow('Unterminated string')
    })

    it('should throw on invalid number', () => {
      expect(() => new Lexer('1.2.3').tokenize()).toThrow(LexerError)
      expect(() => new Lexer('1.2.3').tokenize()).toThrow('multiple decimal points')
    })

    it('should throw on unexpected character', () => {
      expect(() => new Lexer('@').tokenize()).toThrow(LexerError)
      expect(() => new Lexer('@').tokenize()).toThrow('Unexpected character')
    })
  })

  describe('variables', () => {
    it('should tokenize variable reference', () => {
      const lexer = new Lexer('$keyword')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.DOLLAR })
      expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'keyword' })
    })

    it('should tokenize variables block', () => {
      const lexer = new Lexer('variables { keyword = "AI" }')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.VARIABLES })
      expect(tokens[1]).toMatchObject({ type: TokenType.LBRACE })
      expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'keyword' })
      expect(tokens[3]).toMatchObject({ type: TokenType.EQUALS })
      expect(tokens[4]).toMatchObject({ type: TokenType.STRING, value: 'AI' })
    })
  })

  describe('conditional connections', () => {
    it('should tokenize when condition', () => {
      const lexer = new Lexer('[when: $value > 0.7]')
      const tokens = lexer.tokenize()

      expect(tokens[0]).toMatchObject({ type: TokenType.LBRACKET })
      expect(tokens[1]).toMatchObject({ type: TokenType.WHEN })
      expect(tokens[2]).toMatchObject({ type: TokenType.COLON })
      expect(tokens[3]).toMatchObject({ type: TokenType.DOLLAR })
      expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'value' })
      expect(tokens[5]).toMatchObject({ type: TokenType.GT })
      expect(tokens[6]).toMatchObject({ type: TokenType.NUMBER, value: 0.7 })
      expect(tokens[7]).toMatchObject({ type: TokenType.RBRACKET })
    })
  })
})
