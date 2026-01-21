import { root, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata, ToolArgMetadata } from '@sker/core'
import { AnthropicToolUseBlock, AnthropicContentBlock } from './ast'
import { z } from 'zod'

export interface ToolResult {
    tool_use_id: string
    content: string
    is_error?: boolean
}

export interface ToolCall {
    id: string
    name: string
    input: Record<string, any>
}

function isOptionalParam(zodSchema: any): boolean {
    return zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodDefault
}

export function executeTools(toolUses: (AnthropicContentBlock & { type: 'tool_use' })[]): ToolResult[] {
    const toolMetadatas = root.get(ToolMetadataKey) ?? []
    const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []

    const toolArgsMap = new Map<string, ToolArgMetadata[]>()
    for (const argMeta of toolArgMetadatas) {
        const key = `${argMeta.target.name}-${String(argMeta.propertyKey)}`
        if (!toolArgsMap.has(key)) {
            toolArgsMap.set(key, [])
        }
        toolArgsMap.get(key)!.push(argMeta)
    }

    const instanceMap = new Map<string, any>()
    const results: ToolResult[] = []

    for (const toolUse of toolUses) {
        try {
            const toolMeta = toolMetadatas.find((m: ToolMetadata) => m.name === toolUse.name)
            if (!toolMeta) {
                results.push({
                    tool_use_id: toolUse.id,
                    content: `Tool ${toolUse.name} not found`,
                    is_error: true
                })
                continue
            }

            let instance = instanceMap.get(toolMeta.target.name)
            if (!instance) {
                instance = root.get(toolMeta.target)
                instanceMap.set(toolMeta.target.name, instance)
            }

            const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
            const args = toolArgsMap.get(key) ?? []
            const sortedArgs = args.sort((a, b) => a.parameterIndex - b.parameterIndex)

            const callArgs: any[] = []
            for (const arg of sortedArgs) {
                const paramName = arg.paramName ?? `param${arg.parameterIndex}`
                const value = toolUse.input[paramName]

                if (value === undefined && !isOptionalParam(arg.zod)) {
                    throw new Error(`Required parameter '${paramName}' is missing or undefined`)
                }

                callArgs.push(value)
            }

            const result = instance[toolMeta.propertyKey](...callArgs)
            results.push({
                tool_use_id: toolUse.id,
                content: String(result)
            })
        } catch (error) {
            results.push({
                tool_use_id: toolUse.id,
                content: error instanceof Error ? error.message : String(error),
                is_error: true
            })
        }
    }

    return results
}

export function extractToolCalls(content: AnthropicContentBlock[]): ToolCall[] {
    return content
        .filter((block): block is AnthropicToolUseBlock => block.type === 'tool_use')
        .map(block => ({
            id: block.id,
            name: block.name,
            input: block.input
        }))
}
