import { root, ToolMetadataKey, ToolArgMetadataKey, ToolMetadata, ToolArgMetadata, Type } from '@sker/core'
import { z } from 'zod'
import { AnthropicTool, OpenAITool } from './ast'

function zodToJsonSchema(zodSchema: any): any {
    if (zodSchema instanceof z.ZodString) {
        return { type: 'string' }
    }
    if (zodSchema instanceof z.ZodNumber) {
        return { type: 'number' }
    }
    if (zodSchema instanceof z.ZodBoolean) {
        return { type: 'boolean' }
    }
    if (zodSchema instanceof z.ZodArray) {
        return { type: 'array', items: zodToJsonSchema(zodSchema.element) }
    }
    if (zodSchema instanceof z.ZodObject) {
        const properties: Record<string, any> = {}
        const required: string[] = []
        for (const [key, value] of Object.entries(zodSchema.shape)) {
            properties[key] = zodToJsonSchema(value)
            if (!(value as any).isOptional()) {
                required.push(key)
            }
        }
        return { type: 'object', properties, required: required.length > 0 ? required : undefined }
    }
    if (zodSchema instanceof z.ZodOptional) {
        return zodToJsonSchema(zodSchema.unwrap())
    }
    if (zodSchema instanceof z.ZodDefault) {
        return zodToJsonSchema(zodSchema.removeDefault())
    }
    return {}
}

function zodToJsonSchemaWithDescription(zodSchema: any): any {
    const base = zodToJsonSchema(zodSchema)
    const meta = zodSchema?.meta?.()
    if (meta?.description) {
        base.description = meta.description
    }
    return base
}

function isOptionalParam(zodSchema: any): boolean {
    return zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodDefault
}

export function buildAnthropicTools(tools: Type<any>[] = []): AnthropicTool[] {
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

export function buildOpenAITools(tools: Type<any>[] = []): OpenAITool[] {
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
