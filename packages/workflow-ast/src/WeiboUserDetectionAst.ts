import { Ast, Input, Node } from "@sker/workflow";

@Node({ title: '账号检测' })
export class WeiboUserDetectionAst extends Ast {

    @Input({ title: '用户id' })
    uid: string = ``

    @Input({ isMulti: true, title: '开始' })
    canStart: boolean[] = [];

    type: `WeiboUserDetectionAst` = `WeiboUserDetectionAst`

}