import { Injectable, root, Tool, ToolArg } from '@sker/core'
import { ParserVisitor, buildAnthropicTools, aggregateAnthropicStream, executeTools, extractToolCalls } from '../src'
import { Observable, firstValueFrom, pipe } from 'rxjs'
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
    const anthropicTools = buildAnthropicTools()

    const apiKey = 'sk-dffnwnzqutsirejrqkchbeszuabikgxzwrvicrbnwsnclzfp'
    const model = 'Pro/zai-org/GLM-4.7'
    const visitor = root.get(ParserVisitor)

    let messages: any[] = [
        {
            role: 'user',
            content: '查看1.log文件的内容。请使用 read_file 工具来读取文件。'
        }
    ]

    let finalMessage: any = null

    while (true) {
        const response = await fetch('https://api.siliconflow.cn/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 1024,
                messages,
                tools: anthropicTools,
                stream: true
            }),
        })

        const result = await visitor.visitResponse(response)

        if (result instanceof Observable) {
            const message = await firstValueFrom(
                result.pipe(aggregateAnthropicStream())
            )

            finalMessage = message

            messages.push({
                role: 'assistant',
                content: message.content
            })

            if (message.stop_reason !== null) {
                break
            }

            const toolCalls = extractToolCalls(message.content)
            if (toolCalls.length === 0) {
                break
            }

            const toolResults = executeTools(message.content.filter((b): b is any => b.type === 'tool_use'))

            for (const result of toolResults) {
                messages.push({
                    role: 'user',
                    content: [
                        {
                            type: 'tool_result',
                            tool_use_id: result.tool_use_id,
                            content: result.content,
                            is_error: result.is_error ?? false
                        }
                    ]
                })
            }
        } else {
            finalMessage = result
            break
        }
    }

    if (finalMessage) {
        console.log('=== Final AI Response ===')
        for (const block of finalMessage.content) {
            if (block.type === 'text') {
                console.log(block.text)
            } else if (block.type === 'thinking') {
                console.log(`[Thinking] ${block.thinking}`)
            }
        }
        console.log('========================')
    }
}

main()
