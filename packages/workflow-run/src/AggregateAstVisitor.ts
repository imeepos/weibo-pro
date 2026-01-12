import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { AggregateAst, type AggregateOperation } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * AggregateAstVisitor - 数据聚合节点执行器
 *
 * 对输入数组执行聚合操作：sum、avg、min、max、count、concat、merge
 */
@Injectable()
export class AggregateAstVisitor {
    @Handler(AggregateAst)
    visit(ast: AggregateAst, input$: Observable<Record<string, unknown>>) {
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

                    // 确保输入是数组
                    let inputs = ast.inputs || []
                    if (!Array.isArray(inputs)) {
                        inputs = [inputs]
                    }

                    // 执行聚合操作
                    const result = this.aggregate(inputs, ast.operation)

                    ast.result = result

                    const events: NodeEvent[] = [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { result: ast.result } }
                    ]

                    return events
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[AggregateAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[AggregateAstVisitor]' }),
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
     * 执行聚合操作
     */
    private aggregate(inputs: unknown[], operation: AggregateOperation): unknown {
        if (inputs.length === 0) {
            return this.getDefaultValue(operation)
        }

        switch (operation) {
            case 'sum':
                return this.sum(inputs)
            case 'avg':
                return this.avg(inputs)
            case 'min':
                return this.min(inputs)
            case 'max':
                return this.max(inputs)
            case 'count':
                return inputs.length
            case 'concat':
                return this.concat(inputs)
            case 'merge':
                return this.merge(inputs)
            default:
                return inputs
        }
    }

    /**
     * 求和 - 仅对数字有效
     */
    private sum(inputs: unknown[]): number {
        const numbers = inputs.filter(v => typeof v === 'number').map(v => v as number)
        return numbers.reduce((acc, val) => acc + val, 0)
    }

    /**
     * 平均值 - 仅对数字有效
     */
    private avg(inputs: unknown[]): number {
        const numbers = inputs.filter(v => typeof v === 'number').map(v => v as number)
        if (numbers.length === 0) return 0
        return numbers.reduce((acc, val) => acc + val, 0) / numbers.length
    }

    /**
     * 最小值 - 对数字或字符串有效
     */
    private min(inputs: unknown[]): unknown {
        let min: unknown = inputs[0]
        for (let i = 1; i < inputs.length; i++) {
            const val = inputs[i]
            if (typeof val === 'number' && typeof min === 'number') {
                if (val < min) min = val
            } else if (typeof val === 'string' && typeof min === 'string') {
                if (val < min) min = val
            }
        }
        return min
    }

    /**
     * 最大值 - 对数字或字符串有效
     */
    private max(inputs: unknown[]): unknown {
        let max: unknown = inputs[0]
        for (let i = 1; i < inputs.length; i++) {
            const val = inputs[i]
            if (typeof val === 'number' && typeof max === 'number') {
                if (val > max) max = val
            } else if (typeof val === 'string' && typeof max === 'string') {
                if (val > max) max = val
            }
        }
        return max
    }

    /**
     * 拼接 - 将所有元素转为字符串后连接
     */
    private concat(inputs: unknown[]): string {
        return inputs.map(v => String(v ?? '')).join('')
    }

    /**
     * 合并 - 将数组和对象合并
     * [[a, b], {x: 1}, [c]] → [a, b, {x: 1}, c]
     */
    private merge(inputs: unknown[]): unknown[] {
        const result: unknown[] = []
        for (const item of inputs) {
            if (Array.isArray(item)) {
                result.push(...item)
            } else if (item != null) {
                result.push(item)
            }
        }
        return result
    }

    /**
     * 获取操作的默认值
     */
    private getDefaultValue(operation: AggregateOperation): unknown {
        switch (operation) {
            case 'sum':
            case 'avg':
                return 0
            case 'count':
                return 0
            case 'concat':
                return ''
            case 'merge':
                return []
            default:
                return null
        }
    }
}
