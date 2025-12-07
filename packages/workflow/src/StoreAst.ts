import { Ast } from "./ast";
import { Input, Output } from "./decorator";


export class StoreGetAst extends Ast {
    type: `StoreGetAst` = `StoreGetAst`

    @Input({ title: '值' })
    key: string = ``

    @Output({ title: '值' })
    value: string = ``
}

export class StoreSetAst extends Ast {
    type: `StoreSetAst` = `StoreSetAst`

    @Input({ title: '键' })
    key: string = ``

    @Input({ title: '值' })
    @Output({ title: '值' })
    value: string = ``
}
