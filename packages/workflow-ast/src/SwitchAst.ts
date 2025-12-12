import { Ast, Node, Input, Output } from '@sker/workflow'
import { BehaviorSubject } from 'rxjs'

@Node({ title: '分支路由器', type: 'control', dynamicOutputs: true })
export class SwitchAst extends Ast {
    @Input({ title: '输入值' })
    value: any = undefined

    @Output({ title: 'Default', isRouter: true, condition: 'true' })
    output_default: BehaviorSubject<any> = new BehaviorSubject<any>(undefined)

    type: 'SwitchAst' = 'SwitchAst'

    /**
     * 🔧 编译后的元数据（由 Compiler 生成）
     * 明确重新声明 metadata 类型，确保 TypeScript 正确识别
     */
    declare metadata: NonNullable<Ast['metadata']>
}
