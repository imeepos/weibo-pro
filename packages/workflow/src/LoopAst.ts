import { Ast } from './ast'
import { Input, Node, Output, State, IS_MULTI } from './decorator'

@Node({ title: '循环', type: 'control' })
export class LoopAst extends Ast {
    @Input({ title: '数据', mode: IS_MULTI, type: 'any' })
    items: any[] = []

    @State({ title: '批量大小', type: 'number' })
    batchSize: number = 1

    @State({ title: '延迟(ms)', type: 'number' })
    delay: number = 0

    @Output({ title: '当前项' })
    current: any = undefined

    @Output({ title: '当前索引' })
    index: number = 0

    @Output({ title: '总数' })
    total: number = 0

    @Output({ title: '完成信号' })
    done: boolean = false

    type = 'LoopAst';}
