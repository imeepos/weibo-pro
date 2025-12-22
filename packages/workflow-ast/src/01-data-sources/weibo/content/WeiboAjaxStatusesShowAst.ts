import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({
    title: "微博博文详情",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesShowAst extends Ast {
    @Input({ title: "帖子短id", defaultValue: '' })
    mblogid: string = '';

    @Output({ title: "用户ID", defaultValue: '' })
    @Input({ title: "用户ID", defaultValue: '' })
    uid = '';

    @Output({ title: '帖子id', defaultValue: '' })
    mid = ``;

    type: `WeiboAjaxStatusesShowAst` = `WeiboAjaxStatusesShowAst`
}
