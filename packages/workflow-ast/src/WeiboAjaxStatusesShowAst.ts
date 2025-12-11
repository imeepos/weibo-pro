import { Ast, Input, Node, Output } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';

@Node({
    title: "微博博文详情",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesShowAst extends Ast {
    @Input({ title: "帖子短id" })
    mblogid: string = '';

    @Output({ title: "用户ID" })
    @Input({ title: "用户ID" })
    uid: BehaviorSubject<string> = new BehaviorSubject<string>('');

    @Output({ title: '帖子id' })
    mid: BehaviorSubject<string> = new BehaviorSubject<string>(``);

    type: `WeiboAjaxStatusesShowAst` = `WeiboAjaxStatusesShowAst`
}
