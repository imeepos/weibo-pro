import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { ToolExecutorVisitor } from './tool'
import { AnthropicResponseAst } from './ast'

@Injectable()
class TestTool {
    @Tool({
        name: 'read_file',
        description: 'Read a file'
    })
    readFile(
        @ToolArg({ zod: z.string().describe('The path'), paramName: 'path' }) path: string
    ): string {
        return `content of ${path}`
    }
}

describe('ToolExecutorVisitor', () => {
    beforeEach(() => {
        root.set([TestTool])
    })

    it('returns error when required parameter is missing from input', () => {
        const ast = new AnthropicResponseAst()
        ast.id = 'msg_123'
        ast.model = 'claude-3-5-sonnet-20241022'
        ast.role = 'assistant'
        ast.stop_reason = 'tool_use'
        ast.stop_sequence = null
        ast.type = 'message'
        ast.usage = { input_tokens: 100, output_tokens: 50 }
        ast.content = [
            {
                type: 'tool_use' as const,
                id: 'test-id',
                name: 'read_file',
                input: {} // empty input - path is missing
            }
        ]

        const visitor = new ToolExecutorVisitor()
        const results = visitor.visitAnthropicResponseAst(ast, {})

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('test-id')
        expect(result.is_error).toBe(true)
        expect(result.content).toContain('undefined')
    })

    it('executes tool successfully when all required parameters provided', () => {
        const ast = new AnthropicResponseAst()
        ast.id = 'msg_123'
        ast.model = 'claude-3-5-sonnet-20241022'
        ast.role = 'assistant'
        ast.stop_reason = 'tool_use'
        ast.stop_sequence = null
        ast.type = 'message'
        ast.usage = { input_tokens: 100, output_tokens: 50 }
        ast.content = [
            {
                type: 'tool_use' as const,
                id: 'test-id',
                name: 'read_file',
                input: { path: 'test.txt' }
            }
        ]

        const visitor = new ToolExecutorVisitor()
        const results = visitor.visitAnthropicResponseAst(ast, {})

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('test-id')
        expect(result.is_error).toBeUndefined()
        expect(result.content).toBe('content of test.txt')
    })
})
