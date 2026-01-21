import { Injectable, root, Tool, ToolArg } from '@sker/core'
import { ParserVisitor, buildOpenAITools, aggregateOpenAIStreamNative, OpenAIResponseMessage } from '../src'
import { Observable, firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { readFileSync } from 'fs'
import { join } from 'path'


@Injectable()
export class ReadFile {

    @Tool({
        name: 'read_file',
        description: 'Read a file from the filesystem'
    })
    readFile(
        @ToolArg({ zod: z.string().describe('The path to the file'), paramName: 'path' }) path: string
    ): string {
        try {
            const fullPath = join(process.cwd(), path)
            return readFileSync(fullPath, 'utf-8')
        } catch (error) {
            return `Error reading file: ${error instanceof Error ? error.message : String(error)}`
        }
    }
}

async function main() {
    const openaiTools = buildOpenAITools()

    const apiKey = 'sk-dffnwnzqutsirejrqkchbeszuabikgxzwrvicrbnwsnclzfp'
    const model = 'Pro/zai-org/GLM-4.7'
    const visitor = root.get(ParserVisitor)

    const messages: any[] = [
        {
            role: 'user',
            content: '查看1.log文件的内容。请使用 read_file 工具来读取文件。'
        }
    ]

    let finalMessage: OpenAIResponseMessage | null = null

    while (true) {
        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                tools: openaiTools,
                stream: true
            }),
        })

        const result = await visitor.visitResponse(response)

        if (result instanceof Observable) {
            const message = await firstValueFrom(result.pipe(aggregateOpenAIStreamNative()))

            finalMessage = message
            console.log('=== Aggregated Message ===')
            console.log(JSON.stringify(message, null, 2))
            console.log('========================')

            // 添加助手消息到历史
            const assistantMessage: any = {
                role: 'assistant',
                content: message.content || undefined
            }

            // 如果有工具调用，添加到消息中
            if (message.tool_calls && message.tool_calls.length > 0) {
                assistantMessage.tool_calls = message.tool_calls.map(tc => ({
                    id: tc.id,
                    type: tc.type,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }
                }))
                messages.push(assistantMessage)

                // 执行工具调用
                for (const toolCall of message.tool_calls) {
                    const args = JSON.parse(toolCall.function.arguments)
                    console.log(`Executing tool: ${toolCall.function.name}`, args)

                    let toolResult = ''
                    if (toolCall.function.name === 'read_file') {
                        toolResult = new ReadFile().readFile(args.path)
                    }

                    // 添加工具结果到消息
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: toolResult
                    })
                }
            } else {
                messages.push(assistantMessage)
            }

            // 检查是否完成
            if (message.finish_reason === 'stop' || message.finish_reason === 'length') {
                break
            }

            // 如果没有工具调用，也退出
            if (!message.tool_calls || message.tool_calls.length === 0) {
                break
            }

        } else {
            // 非流式响应
            console.log('Non-stream response:', JSON.stringify(result, null, 2))
            break
        }
    }

    if (finalMessage) {
        console.log('=== Final AI Response ===')
        if (finalMessage.content) {
            console.log(finalMessage.content)
        }
        console.log('========================')
    }
}

main()
