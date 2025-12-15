import { Ast, Input, Node, Output, State } from "@sker/workflow";


@Node({
    title: "微博评论",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesCommentAst extends Ast {

    @Input({ title: "帖子ID", defaultValue: '' })
    mid!: string;

    @Input({ title: "用户ID", defaultValue: '' })
    uid!: string;

    // 默认
    @State({ title: "最大ID" })
    max_id: number | undefined = undefined;

    @State({ title: "数量" })
    count: number = 20;

    @State({ title: "显示公告" })
    is_show_bulletin: number = 3;

    @State({ title: "混合模式" })
    is_mix: number = 0;

    @State({ title: "获取级别" })
    fetch_level: number = 0;

    @State({ title: "下一最大ID" })
    next_max_id: number = 0;

    @Output({ title: '结束', defaultValue: false })
    is_end = false;

    type: `WeiboAjaxStatusesCommentAst` = `WeiboAjaxStatusesCommentAst`
}
