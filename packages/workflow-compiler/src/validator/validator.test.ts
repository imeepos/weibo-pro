import { describe, it, expect } from 'vitest'
import { WorkflowValidator, } from './index'
import { WorkflowDefinition } from '../parser'

describe('WorkflowValidator', () => {
  const validator = new WorkflowValidator()

  describe('node ID uniqueness', () => {
    it('should pass when all node IDs are unique', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          { type: 'Node', id: 'node1', nodeType: 'TypeA' },
          { type: 'Node', id: 'node2', nodeType: 'TypeB' },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when node IDs are duplicated', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          { type: 'Node', id: 'search', nodeType: 'TypeA', position: { line: 2, column: 3 } },
          { type: 'Node', id: 'search', nodeType: 'TypeB', position: { line: 3, column: 3 } },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('search')
      expect(result.errors[0].severity).toBe('error')
    })
  })

  describe('connection validity', () => {
    it('should pass when connections reference existing nodes', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          { type: 'Node', id: 'node1', nodeType: 'TypeA' },
          { type: 'Node', id: 'node2', nodeType: 'TypeB' },
        ],
        connections: [
          {
            type: 'Connection',
            from: { nodeId: 'node1', portName: 'output' },
            to: { nodeId: 'node2', portName: 'input' },
          },
        ],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(true)
    })

    it('should fail when connection references non-existent source node', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [{ type: 'Node', id: 'node1', nodeType: 'TypeA' }],
        connections: [
          {
            type: 'Connection',
            from: { nodeId: 'nonexistent', portName: 'output' },
            to: { nodeId: 'node1', portName: 'input' },
            position: { line: 5, column: 3 },
          },
        ],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('nonexistent')
    })

    it('should fail when connection references non-existent target node', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [{ type: 'Node', id: 'node1', nodeType: 'TypeA' }],
        connections: [
          {
            type: 'Connection',
            from: { nodeId: 'node1', portName: 'output' },
            to: { nodeId: 'analyzer', portName: 'input' },
            position: { line: 5, column: 3 },
          },
        ],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('analyzer')
    })
  })

  describe('variable reference validity', () => {
    it('should pass when all variables are declared', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        variables: [{ type: 'VariableDeclaration', name: 'keyword', value: { type: 'Literal', value: 'test' } }],
        nodes: [
          {
            type: 'Node',
            id: 'node1',
            nodeType: 'TypeA',
            inputs: { keyword: { type: 'Variable', name: 'keyword' } },
          },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(true)
    })

    it('should fail when variable is not declared', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          {
            type: 'Node',
            id: 'node1',
            nodeType: 'TypeA',
            inputs: { keyword: { type: 'Variable', name: 'undeclared', position: { line: 4, column: 20 } } },
          },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('undeclared')
    })

    it('should check variables in nested expressions', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          {
            type: 'Node',
            id: 'node1',
            nodeType: 'TypeA',
            inputs: {
              config: {
                type: 'Object',
                properties: {
                  nested: { type: 'Variable', name: 'missing', position: { line: 5, column: 15 } },
                },
              },
            },
          },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('missing')
    })

    it('should check variables in array expressions', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          {
            type: 'Node',
            id: 'node1',
            nodeType: 'TypeA',
            inputs: {
              items: {
                type: 'Array',
                elements: [{ type: 'Variable', name: 'notDefined', position: { line: 5, column: 10 } }],
              },
            },
          },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('notDefined')
    })

    it('should check variables in binary expressions', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          {
            type: 'Node',
            id: 'node1',
            nodeType: 'TypeA',
            inputs: {
              value: {
                type: 'BinaryExpression',
                operator: '+',
                left: { type: 'Variable', name: 'x', position: { line: 5, column: 10 } },
                right: { type: 'Literal', value: 1 },
              },
            },
          },
        ],
        connections: [],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('x')
    })

    it('should check variables in connection conditions', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          { type: 'Node', id: 'node1', nodeType: 'TypeA' },
          { type: 'Node', id: 'node2', nodeType: 'TypeB' },
        ],
        connections: [
          {
            type: 'Connection',
            from: { nodeId: 'node1', portName: 'output' },
            to: { nodeId: 'node2', portName: 'input' },
            condition: { type: 'Variable', name: 'flag', position: { line: 6, column: 15 } },
          },
        ],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('flag')
    })
  })

  describe('multiple errors', () => {
    it('should collect all validation errors', () => {
      const ast: WorkflowDefinition = {
        type: 'Workflow',
        name: 'test',
        nodes: [
          { type: 'Node', id: 'dup', nodeType: 'TypeA' },
          { type: 'Node', id: 'dup', nodeType: 'TypeB' },
        ],
        connections: [
          {
            type: 'Connection',
            from: { nodeId: 'missing1', portName: 'output' },
            to: { nodeId: 'missing2', portName: 'input' },
          },
        ],
      }
      const result = validator.validate(ast)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
