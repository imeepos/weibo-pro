import { Injectable } from '@sker/core'
import { Ast, WorkflowGraphAst } from './ast'
import { Input, Node, Output, State, IS_MULTI, Handler } from './decorator'
import { Observable } from 'rxjs'
import { NodeEvent } from './execution/events'

/**
 * 过滤条件类型
 */
export type FilterOperator =
    | 'equals'           // 等于
    | 'notEquals'        // 不等于
    | 'contains'         // 包含
    | 'notContains'      // 不包含
    | 'startsWith'       // 开头匹配
    | 'endsWith'         // 结尾匹配
    | 'gt'               // 大于
    | 'gte'              // 大于等于
    | 'lt'               // 小于
    | 'lte'              // 小于等于
    | 'isEmpty'          // 为空
    | 'isNotEmpty'       // 不为空
    | 'regex'            // 正则匹配
    | 'expression'       // 自定义表达式

/**
 * 过滤条件
 */
export interface FilterCondition {
    field: string
    operator: FilterOperator
    value?: any
}

/**
 * 过滤节点
 *
 * 从输入数据中过滤出符合条件的项，不符合条件的项被丢弃。
 * 与 If 节点不同：If 做分支路由，Filter 直接剔除数据。
 *
 * 支持两种模式：
 * 1. 条件模式：配置 field + operator + value
 * 2. 表达式模式：编写 JS 表达式（item => item.score > 80）
 *
 * @example
 * // 条件模式：过滤 score > 80 的数据
 * filter.conditions = [{ field: 'score', operator: 'gt', value: 80 }]
 *
 * // 表达式模式
 * filter.expression = 'item.status === "active" && item.count > 10'
 */
@Node({ title: '过滤', type: 'basic' })
export class FilterAst extends Ast {
    @Input({ title: '数据', mode: IS_MULTI, type: 'any' })
    items: any[] = []

    @State({ title: '过滤条件' })
    conditions: FilterCondition[] = []

    @State({ title: '条件逻辑', type: 'string' })
    logic: 'and' | 'or' = 'and'

    @State({ title: '表达式', type: 'text' })
    expression?: string

    @Output({ title: '匹配数据' })
    matched: any[] = []

    @Output({ title: '匹配数量' })
    matchedCount: number = 0

    type = 'FilterAst';}



@Injectable()
export class FilterAstVisitor {
    @Handler(FilterAst)
    handler(ast: FilterAst, _workflow: WorkflowGraphAst): Observable<NodeEvent> {
        return new Observable<NodeEvent>(obs => {
            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            let items = ast.items || []
            if (!Array.isArray(items)) {
                items = [items]
            }
            items = items.flat()

            let matched: any[]

            if (ast.expression) {
                matched = this.filterByExpression(items, ast.expression)
            } else if (ast.conditions.length > 0) {
                matched = this.filterByConditions(items, ast.conditions, ast.logic)
            } else {
                matched = items.filter(Boolean)
            }
            obs.next({ type: 'node_emit', id: ast.id, data: { matched, matchedCount: matched.length } })

            ast.state = 'success'
            obs.next({ type: 'node_success', id: ast.id })
            obs.complete()
        })
    }

    private filterByExpression(items: any[], expression: string): any[] {
        try {
            const filterFn = new Function('item', 'index', `return ${expression}`)
            return items.filter((item, index) => {
                try {
                    return filterFn(item, index)
                } catch {
                    return false
                }
            })
        } catch {
            return []
        }
    }

    private filterByConditions(
        items: any[],
        conditions: FilterCondition[],
        logic: 'and' | 'or'
    ): any[] {
        return items.filter(item => {
            const results = conditions.map(cond => this.evaluateCondition(item, cond))
            return logic === 'and'
                ? results.every(Boolean)
                : results.some(Boolean)
        })
    }

    private evaluateCondition(item: any, condition: FilterCondition): boolean {
        const value = this.getFieldValue(item, condition.field)
        const target = condition.value

        const operators: Record<FilterOperator, () => boolean> = {
            equals: () => value === target,
            notEquals: () => value !== target,
            contains: () => String(value).includes(String(target)),
            notContains: () => !String(value).includes(String(target)),
            startsWith: () => String(value).startsWith(String(target)),
            endsWith: () => String(value).endsWith(String(target)),
            gt: () => Number(value) > Number(target),
            gte: () => Number(value) >= Number(target),
            lt: () => Number(value) < Number(target),
            lte: () => Number(value) <= Number(target),
            isEmpty: () => value == null || value === '' || (Array.isArray(value) && value.length === 0),
            isNotEmpty: () => value != null && value !== '' && !(Array.isArray(value) && value.length === 0),
            regex: () => new RegExp(String(target)).test(String(value)),
            expression: () => {
                try {
                    return new Function('value', 'item', `return ${target}`)(value, item)
                } catch {
                    return false
                }
            }
        }

        return operators[condition.operator]?.() ?? false
    }

    private getFieldValue(item: any, field: string): any {
        if (!field) return item
        return field.split('.').reduce((obj, key) => obj?.[key], item)
    }
}
