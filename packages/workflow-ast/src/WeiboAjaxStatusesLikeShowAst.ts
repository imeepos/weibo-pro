import { Ast, Input, Node, Output, State } from "@sker/workflow";

@Node({
    title: "微博点赞",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesLikeShowAst extends Ast {

    @Input({ title: "帖子ID" })
    mid: string = ``;
    @Input({ title: "用户ID" })
    uid: string = ``;

    @State({ title: "页码" })
    page: number = 1;
    @State({ title: "数量" })
    count: number = 20;
    /**
     * 默认值
     */
    @State({ title: "态度类型" })
    attitude_type: number = 0;
    @State({ title: "态度启用" })
    attitude_enable: number = 1;

    @Output({ title: '结束' })
    is_end: boolean = false;

    type: `WeiboAjaxStatusesLikeShowAst` = `WeiboAjaxStatusesLikeShowAst`
}