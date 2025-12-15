import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({
    title: '账号检测',
    type: 'crawler',
    errorStrategy: 'abort',  // 账号异常必须中断工作流
    maxRetries: 2,
    retryDelay: 3000,
    retryBackoff: 1
})
export class WeiboUserDetectionAst extends Ast {

    @Input({ title: '用户id', defaultValue: '' })
    uid: string = ``

    @Input({ isMulti: true, title: '开始', defaultValue: [] })
    canStart: boolean[] = [];

    @Output({ title: '结束', defaultValue: false })
    is_end = false;

    type: `WeiboUserDetectionAst` = `WeiboUserDetectionAst`

}