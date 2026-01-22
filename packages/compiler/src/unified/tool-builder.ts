/**
 * @fileoverview 统一工具构建器
 * @description 基于装饰器元数据构建 UnifiedTool，并转换为各厂商格式
 * @version 2.0
 */

import { root, ToolMetadataKey, ToolArgMetadataKey, Type } from '@sker/core'
import { ToolMetadata, ToolArgMetadata } from '@sker/core'
import { z } from 'zod'
import { AnthropicTool, OpenAITool, GoogleTool, GoogleToolFunctionDeclaration, UnifiedTool, UnifiedToolParameters } from '../ast'

// ==================== 辅助函数（复用现有逻辑） ====================

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

// ==================== 核心构建函数 ====================

/**
 * 从装饰器元数据构建统一工具列表
 * @param tools 可选的工具类列表（未使用，兼容现有 API）
 * @returns UnifiedTool[] 统一工具列表
 */
export function buildUnifiedTools(tools: Type<any>[] = []): UnifiedTool[] {
    const toolMetadatas = root.get(ToolMetadataKey) ?? []
    const toolArgMetadatas = root.get(ToolArgMetadataKey) ?? []

    // 构建参数映射
    const toolArgsMap = new Map<string, ToolArgMetadata[]>()
    for (const argMeta of toolArgMetadatas) {
        const key = `${argMeta.target.name}-${String(argMeta.propertyKey)}`
        if (!toolArgsMap.has(key)) {
            toolArgsMap.set(key, [])
        }
        toolArgsMap.get(key)!.push(argMeta)
    }

    // 转换为 UnifiedTool 格式
    return toolMetadatas.map((toolMeta: ToolMetadata): UnifiedTool => {
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
            parameters: {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined
            }
        }
    })
}

// ==================== 厂商转换函数 ====================

/**
 * 统一工具转换为 Anthropic 格式
 * @param tools 统一工具列表
 * @returns AnthropicTool[] Anthropic 工具列表
 */
export function unifiedToolsToAnthropic(tools: UnifiedTool[]): AnthropicTool[] {
    return tools.map((tool): AnthropicTool => {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
        }
    })
}

/**
 * 统一工具转换为 OpenAI 格式
 * @param tools 统一工具列表
 * @returns OpenAITool[] OpenAI 工具列表
 */
export function unifiedToolsToOpenAI(tools: UnifiedTool[]): OpenAITool[] {
    return tools.map((tool): OpenAITool => {
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: tool.parameters.properties,
                    required: tool.parameters.required
                }
            }
        }
    })
}

/**
 * 统一工具转换为 Google 格式
 * @param tools 统一工具列表
 * @returns GoogleTool Google 工具对象
 */
export function unifiedToolsToGoogle(tools: UnifiedTool[]): GoogleTool {
    const functionDeclarations: GoogleToolFunctionDeclaration[] = tools.map((tool) => {
        return {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required
            }
        }
    })

    return {
        functionDeclarations
    }
}
