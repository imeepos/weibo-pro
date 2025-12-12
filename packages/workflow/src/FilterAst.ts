import { Ast } from './ast'
import { Input, Node, Output, State, IS_MULTI } from './decorator'
import { BehaviorSubject } from 'rxjs'

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
    matched: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([])

    @Output({ title: '匹配数量' })
    matchedCount: BehaviorSubject<number> = new BehaviorSubject<number>(0)

    type: 'FilterAst' = 'FilterAst'
}
