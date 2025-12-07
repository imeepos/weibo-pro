import { Ast } from "./ast";
import { Input, Node, Output } from "./decorator";

@Node()
export class MqPushAst extends Ast {
    type: `MqPushAst` = `MqPushAst`

    @Input({ title: '入栈' })
    input: string = ``
}

@Node()
export class MqPullAst extends Ast {
    type: `MqPullAst` = `MqPullAst`

    @Output({ title: '出栈' })
    output: string = ``
}
