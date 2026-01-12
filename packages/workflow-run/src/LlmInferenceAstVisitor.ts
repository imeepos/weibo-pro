import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { LlmInferenceAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * LlmInferenceAstVisitor - LLM 推理节点执行器
 *
 * 通用的 LLM 推理节点，支持自定义系统提示词和用户提示词。
 */
@Injectable()
export class LlmInferenceAstVisitor {
    @Handler(LlmInferenceAst)
    visit(ast: LlmInferenceAst, input$: Observable<Record<string, unknown>>) {
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

                    // 构建消息列表
                    const messages: Array<{ role: string; content: string }> = []

                    // 添加系统提示词
                    if (ast.system && ast.system.length > 0) {
                        const systemContent = ast.system.join('\n\n')
                        messages.push({ role: 'system', content: systemContent })
                    }

                    // 添加用户提示词
                    if (ast.prompt && ast.prompt.length > 0) {
                        const userContent = ast.prompt.join('\n\n')
                        messages.push({ role: 'human', content: userContent })
                    }

                    // 调用 LLM
                    const llmModel = useLlmModel({ model: ast.model, temperature: ast.temperature })
                    const result = await llmModel.invoke(messages)

                    // 更新输出
                    ast.text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { text: ast.text } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmInferenceAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmInferenceAstVisitor]' }),
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
