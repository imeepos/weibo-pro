import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { TransformAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * TransformAstVisitor - 数据转换节点执行器
 *
 * 使用 JavaScript 表达式对输入数据进行转换。
 * 支持属性访问、数组操作、对象操作等常见转换。
 */
@Injectable()
export class TransformAstVisitor {
    @Handler(TransformAst)
    visit(ast: TransformAst, input$: Observable<Record<string, unknown>>) {
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

                    // 执行转换表达式
                    const result = this.evaluateTransform(ast.input, ast.expression)

                    ast.output = result

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { output: ast.output } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[TransformAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[TransformAstVisitor]' }),
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

    /**
     * 安全地评估转换表达式
     * 支持：属性访问 (data.name)、数组访问 (data[0])、嵌套访问 (data.user.profile.name)
     */
    private evaluateTransform(input: unknown, expression: string): unknown {
        if (!expression?.trim()) {
            return input
        }

        // 简单的属性路径解析：支持 "data", "data.name", "data.user.profile"
        const parts = expression.split('.')
        let result: unknown = input

        for (const part of parts) {
            if (result == null) return null

            // 处理数组索引 data[0] 或 data.items[0]
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
            if (arrayMatch) {
                const [, prop, index] = arrayMatch
                result = (result as Record<string, unknown>)[prop!]
                if (Array.isArray(result)) {
                    result = result[Number(index)]
                }
                continue
            }

            result = (result as Record<string, unknown>)[part]
        }

        return result
    }
}
