import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { executeTools, ToolResult } from './tool-executor'

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

describe('executeTools', () => {
    beforeEach(() => {
        root.set([TestTool])
    })

    it('returns error when required parameter is missing from input', () => {
        const toolUses = [
            {
                type: 'tool_use' as const,
                id: 'test-id',
                name: 'read_file',
                input: {} // empty input - path is missing
            }
        ]

        const results = executeTools(toolUses)

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('test-id')
        expect(result.is_error).toBe(true)
        expect(result.content).toContain('undefined')
    })

    it('executes tool successfully when all required parameters provided', () => {
        const toolUses = [
            {
                type: 'tool_use' as const,
                id: 'test-id',
                name: 'read_file',
                input: { path: 'test.txt' }
            }
        ]

        const results = executeTools(toolUses)

        expect(results).toHaveLength(1)
        const result = results[0]!
        expect(result.tool_use_id).toBe('test-id')
        expect(result.is_error).toBeUndefined()
        expect(result.content).toBe('content of test.txt')
    })
})
