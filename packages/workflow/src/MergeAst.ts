import { Ast } from './ast'
import { Input, Node, Output, State, IS_MULTI, IS_BUFFER } from './decorator'
import { BehaviorSubject } from 'rxjs'

/**
 * 合并模式
 */
export type MergeMode =
    | 'append'           // 追加：所有输入数据按顺序拼接
    | 'combine'          // 组合：按索引配对合并（类似 zip）
    | 'chooseBranch'     // 选择分支：取第一个有数据的分支
    | 'wait'             // 等待：等待所有分支完成后合并

/**
 * 合并节点
 *
 * 将多个数据流合并为单一数据流。
 *
 * 四种合并模式：
 * 1. append - 追加模式：[A1, A2] + [B1, B2] → [A1, A2, B1, B2]
 * 2. combine - 组合模式：[A1, A2] + [B1, B2] → [{a: A1, b: B1}, {a: A2, b: B2}]
 * 3. chooseBranch - 选择分支：取第一个非空分支的数据
 * 4. wait - 等待模式：等待所有输入完成后输出
 *
 * @example
 * // 追加模式
 * merge.mode = 'append'
 * // 输入1: [{id: 1}], 输入2: [{id: 2}]
 * // 输出: [{id: 1}, {id: 2}]
 */
@Node({ title: '合并', type: 'basic' })
export class MergeAst extends Ast {
    @Input({ title: '数据流', mode: IS_MULTI | IS_BUFFER, type: 'any' })
    inputs: any[] = []

    @State({ title: '合并模式', type: 'string' })
    mode: MergeMode = 'append'

    @Output({ title: '合并结果' })
    result: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([])

    @Output({ title: '数据总量' })
    totalCount: BehaviorSubject<number> = new BehaviorSubject<number>(0)

    type: 'MergeAst' = 'MergeAst'
}
