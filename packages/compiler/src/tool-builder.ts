import { root, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata, ToolArgMetadata, Type } from '@sker/core'
import { AnthropicTool, OpenAITool } from './ast'
import { zodToJsonSchema, zodToJsonSchemaWithDescription, isOptionalParam } from './utils/zod-to-json-schema'

export function buildAnthropicTools(_tools: Type<any>[] = []): AnthropicTool[] {
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

    return toolMetadatas.map((toolMeta: ToolMetadata): AnthropicTool => {
        const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
        const args = toolArgsMap.get(key) ?? []

        const properties: Record<string, any> = {}
        const required: string[] = []

        for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
            const paramName = arg.paramName ?? `param${arg.parameterIndex}`
            properties[paramName] = zodToJsonSchema(arg.zod)
            if (!isOptionalParam(arg.zod)) {
                required.push(paramName)
            }
        }

        return {
            name: toolMeta.name,
            description: toolMeta.description,
            input_schema: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined
            }
        }
    })
}

export function buildOpenAITools(_tools: Type<any>[] = []): OpenAITool[] {
    const toolMetadatas = (root.get(ToolMetadataKey) ?? []).filter((m: any) => m?.target)
    const toolArgMetadatas = (root.get(ToolArgMetadataKey) ?? []).filter((m: any) => m?.target)

    const toolArgsMap = new Map<string, ToolArgMetadata[]>()
    for (const argMeta of toolArgMetadatas) {
        const key = `${argMeta.target.name}-${String(argMeta.propertyKey)}`
        if (!toolArgsMap.has(key)) {
            toolArgsMap.set(key, [])
        }
        toolArgsMap.get(key)!.push(argMeta)
    }

    return toolMetadatas.map((toolMeta: ToolMetadata): OpenAITool => {
        const key = `${toolMeta.target.name}-${String(toolMeta.propertyKey)}`
        const args = toolArgsMap.get(key) ?? []

        const properties: Record<string, any> = {}
        const required: string[] = []

        for (const arg of args.sort((a, b) => a.parameterIndex - b.parameterIndex)) {
            const paramName = arg.paramName ?? `param${arg.parameterIndex}`
            properties[paramName] = zodToJsonSchemaWithDescription(arg.zod)
            if (!isOptionalParam(arg.zod)) {
                required.push(paramName)
            }
        }

        return {
            type: 'function',
            function: {
                name: toolMeta.name,
                description: toolMeta.description,
                parameters: {
                    type: 'object',
                    properties,
                    required: required.length > 0 ? required : undefined
                }
            }
        }
    })
}
