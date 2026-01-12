import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { WeiboUserDetectionAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * 微博账号检测节点执行器
 *
 * 职责：
 * - 检测微博账号状态
 * - 判断是否可以开始任务
 * - 用于账号切换和异常检测
 *
 * 优雅设计：
 * - 根据输入条件判断是否结束
 * - 支持多路输入控制
 * - 简单的状态机逻辑
 */
@Injectable()
export class WeiboUserDetectionAstVisitor {
    @Handler(WeiboUserDetectionAst)
    visit(ast: WeiboUserDetectionAst, input$: Observable<Record<string, unknown>>) {
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

                    // 检测逻辑：
                    // - 如果有 canStart 输入且为 true，则不结束（is_end = false）
                    // - 如果 canStart 为 false 或空，则结束（is_end = true）
                    // - 用于控制工作流是否继续执行（如账号异常时停止）

                    let shouldEnd = true

                    if (ast.canStart && ast.canStart.length > 0) {
                        // 检查是否所有 canStart 都为 true
                        shouldEnd = !ast.canStart.every(start => start === true)
                    }

                    ast.is_end = shouldEnd

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { is_end: ast.is_end, uid: ast.uid } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[WeiboUserDetectionAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[WeiboUserDetectionAstVisitor]' }),
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
