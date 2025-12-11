import { Ast, Input, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';

@Node({
    title: '账号检测',
    type: 'crawler',
    errorStrategy: 'abort',  // 账号异常必须中断工作流
    maxRetries: 2,
    retryDelay: 3000,
    retryBackoff: 1
})
export class WeiboUserDetectionAst extends Ast {

    @Input({ title: '用户id' })
    uid: string = ``

    @Input({ isMulti: true, title: '开始' })
    canStart: boolean[] = [];

    @Output({ title: '结束' })
    is_end: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    type: `WeiboUserDetectionAst` = `WeiboUserDetectionAst`

}