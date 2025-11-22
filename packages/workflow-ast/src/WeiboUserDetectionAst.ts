import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: '账号检测' })
export class WeiboUserDetectionAst extends Ast {

    @Input({ title: '用户id' })
    uid: string = ``

    @Input({ isMulti: true, title: '开始' })
    canStart: boolean[] = [];

    @Output({ title: '结束' })
    is_end: boolean = false;

    type: `WeiboUserDetectionAst` = `WeiboUserDetectionAst`

}