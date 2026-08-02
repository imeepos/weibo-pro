import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { HtmlDisplayAst, JsonDisplayAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * 显示节点执行器
 *
 * 优雅设计：
 * - HtmlDisplayAst: 直接透传 HTML 内容，用于在 UI 中渲染
 * - JsonDisplayAst: 格式化 JSON 数据，便于展示
 *
 * 存在即合理：
 * - 这些节点主要用于前端展示，后端执行时直接透传数据
 * - 确保数据格式正确，便于前端渲染
 */
@Injectable()
export class DisplayAstVisitor {
    @Handler(HtmlDisplayAst)
    visitHtmlDisplay(ast: HtmlDisplayAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
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

                    // 直接透传 HTML 内容
                    ast.rendered = ast.html

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { rendered: ast.rendered } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[DisplayAstVisitor.Html]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[DisplayAstVisitor.Html]' }),
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
                obs.complete()
            }
        })
    }

    @Handler(JsonDisplayAst)
    visitJsonDisplay(ast: JsonDisplayAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
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

                    // 格式化 JSON 数据
                    try {
                        ast.formatted = typeof ast.json === 'string'
                            ? ast.json
                            : JSON.stringify(ast.json, null, 2)
                    } catch (_error) {
                        ast.formatted = String(ast.json)
                    }

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { formatted: ast.formatted } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[DisplayAstVisitor.Json]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[DisplayAstVisitor.Json]' }),
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
                obs.complete()
            }
        })
    }
}
