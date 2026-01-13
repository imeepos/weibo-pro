import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { LlmImageToTextAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { ErrorHandlerOperators } from './utils/error-handler.util'

@Injectable()
export class LlmImageToTextAstVisitor {
    @Handler(LlmImageToTextAst)
    visit(ast: LlmImageToTextAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    const messages: Array<{ role: string; content: Array<{ type: string; text?: string; image_url?: { url: string } }> }> = []
                    const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

                    if (ast.images && ast.images.length > 0) {
                        ast.images.forEach(imageUrl => {
                            imageContent.push({
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            })
                        })
                    }

                    imageContent.push({
                        type: 'text',
                        text: '请详细描述这张图片的内容'
                    })

                    messages.push({
                        role: 'user',
                        content: imageContent
                    })

                    const llmModel = useLlmModel({
                        model: 'openai/gpt-4o',
                        temperature: 0.7
                    })

                    const result = await llmModel.invoke(messages)
                    ast.text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { text: ast.text } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmImageToTextAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmImageToTextAstVisitor]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }
}
