import { Ast, Input, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';

@Node({
    title: "微博个人信息",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxProfileInfoAst extends Ast {

    @Input({ title: "用户ID" })
    uid: string = ``;

    @Output({ title: '是否结束' })
    isEnd: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    type: `WeiboAjaxProfileInfoAst` = `WeiboAjaxProfileInfoAst`
}
