import { Injectable } from '@sker/core'
import { Handler, FilterAst, type FilterCondition, type FilterOperator } from '@sker/workflow'
import { Observable } from 'rxjs'

@Injectable()
export class FilterAstVisitor {
    @Handler(FilterAst)
    handler(ast: FilterAst, ctx: any) {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

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

            ast.matched.next(matched)
            ast.matchedCount.next(matched.length)

            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
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
