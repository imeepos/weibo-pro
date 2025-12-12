import { Ast } from './ast'
import { Input, Node, Output, State, IS_MULTI } from './decorator'
import { BehaviorSubject } from 'rxjs'

/**
 * 循环节点
 *
 * 遍历数组，逐个输出每个元素。
 * 下游节点会针对每个元素执行一次。
 *
 * 特性：
 * - 支持批量处理（batchSize）
 * - 支持延迟执行（delay）防止 API 限流
 * - 输出当前索引和总数，便于进度追踪
 *
 * @example
 * // 输入: [1, 2, 3, 4, 5]
 * // batchSize = 2
 * // 输出: 依次发射 [1, 2], [3, 4], [5]
 *
 * @example
 * // 输入: ['a', 'b', 'c']
 * // batchSize = 1 (默认)
 * // 输出: 依次发射 'a', 'b', 'c'
 */
@Node({ title: '循环', type: 'basic' })
export class LoopAst extends Ast {
    @Input({ title: '数据', mode: IS_MULTI, type: 'any' })
    items: any[] = []

    @State({ title: '批量大小', type: 'number' })
    batchSize: number = 1

    @State({ title: '延迟(ms)', type: 'number' })
    delay: number = 0

    @Output({ title: '当前项' })
    current: BehaviorSubject<any> = new BehaviorSubject<any>(undefined)

    @Output({ title: '当前索引' })
    index: BehaviorSubject<number> = new BehaviorSubject<number>(0)

    @Output({ title: '总数' })
    total: BehaviorSubject<number> = new BehaviorSubject<number>(0)

    @Output({ title: '完成信号' })
    done: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

    type: 'LoopAst' = 'LoopAst'
}
