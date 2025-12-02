import { Ast, Node, Input, Output } from '@sker/workflow'

@Node({ title: '分支路由器', type: 'control' })
export class SwitchAst extends Ast {
    @Input({ title: '输入值' })
    value: any = undefined

    // 路由输出（用户可根据需要修改条件）
    @Output({ title: 'Case 1', isRouter: true, dynamic: true, condition: '$input === 1' })
    output_case1: any = undefined

    @Output({ title: 'Case 2', isRouter: true, dynamic: true, condition: '$input === 2' })
    output_case2: any = undefined

    @Output({ title: 'Default', isRouter: true, dynamic: true, condition: 'true' })
    output_default: any = undefined

    type: 'SwitchAst' = 'SwitchAst'
}
