import { Ast, Input, Node, Output, State } from "@sker/workflow";

@Node({
    title: "微博转发",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input({ title: "帖子ID", defaultValue: '' })
    mid: string = ``;

    @Input({ title: "用户ID", defaultValue: '' })
    uid: string = ``;

    @State({ title: "页码" })
    page: number = 1;

    @Output({ title: '结束', defaultValue: false })
    is_end = false;

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}