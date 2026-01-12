import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { RouteAst } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * RouteAstVisitor - 条件路由节点执行器
 *
 * 根据条件规则将输入数据路由到不同的输出端口。
 * 每条规则包含一个条件表达式和对应的输出端口名称。
 */
@Injectable()
export class RouteAstVisitor {
    @Handler(RouteAst)
    visit(ast: RouteAst, input$: Observable<Record<string, unknown>>) {
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

                    // 评估路由规则
                    const matchedRoute = this.evaluateRoute(ast.value, ast.rules)

                    // 发射到匹配的输出端口
                    const events: NodeEvent[] = [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } }
                    ]

                    if (matchedRoute) {
                        // 发射到命中的路由输出
                        // 使用 data 对象传递值，属性名格式为 output_{routeName}
                        events.push({
                            type: 'node_emit' as const,
                            id: ast.id,
                            data: { [`output_${matchedRoute}`]: ast.value }
                        })
                    } else {
                        // 发射到默认输出
                        events.push({
                            type: 'node_emit' as const,
                            id: ast.id,
                            data: { output_default: ast.value }
                        })
                    }

                    return events
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[RouteAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[RouteAstVisitor]' }),
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
     * 评估路由规则，返回匹配的输出端口名称
     */
    private evaluateRoute(value: unknown, rules: Array<{ condition: string; output: string }>): string | null {
        if (!rules || rules.length === 0) {
            return null
        }

        for (const rule of rules) {
            if (this.evaluateCondition(value, rule.condition)) {
                return rule.output
            }
        }

        return null
    }

    /**
     * 评估单个条件表达式
     * 支持：相等比较 (value == "xxx")、布尔检查、null 检查等
     */
    private evaluateCondition(value: unknown, condition: string): boolean {
        if (!condition?.trim()) {
            return false
        }

        // 支持简单比较表达式
        // 格式：value == "something" 或 value === 123 或 value != null
        const comparisonMatch = condition.match(/^\s*value\s*(==|===|!=|!==|>|<|>=|<=)\s*(.+)\s*$/)
        if (comparisonMatch) {
            const [, operator, rightOperand] = comparisonMatch
            const right = this.parseValue(rightOperand!)
            return this.compare(value, operator!, right)
        }

        // 支持布尔检查
        if (condition === 'value') {
            return Boolean(value)
        }

        // 支持 !value 检查
        if (condition === '!value' || condition === '!value ') {
            return !value
        }

        return false
    }

    /**
     * 解析值字面量
     * 支持：字符串 ("xxx" 或 'xxx')、数字、布尔值、null
     */
    private parseValue(str: string): unknown {
        str = str.trim()

        // 字符串
        if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
            return str.slice(1, -1)
        }

        // 数字
        if (/^\d+(\.\d+)?$/.test(str)) {
            return Number(str)
        }

        // 布尔值
        if (str === 'true') return true
        if (str === 'false') return false
        if (str === 'null') return null

        return str
    }

    /**
     * 执行比较操作
     */
    private compare(left: unknown, operator: string, right: unknown): boolean {
        switch (operator) {
            case '==':
                // eslint-disable-next-line eqeqeq
                return left == right
            case '===':
                return left === right
            case '!=':
                // eslint-disable-next-line eqeqeq
                return left != right
            case '!==':
                return left !== right
            case '>':
                return typeof left === 'number' && typeof right === 'number' && left > right
            case '<':
                return typeof left === 'number' && typeof right === 'number' && left < right
            case '>=':
                return typeof left === 'number' && typeof right === 'number' && left >= right
            case '<=':
                return typeof left === 'number' && typeof right === 'number' && left <= right
            default:
                return false
        }
    }
}
