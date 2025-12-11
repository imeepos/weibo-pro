import { Ast, Input, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';


@Node({
    title: "微博评论",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesCommentAst extends Ast {

    @Input({ title: "帖子ID" })
    mid!: string;

    @Input({ title: "用户ID" })
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

    @Output({ title: '结束' })
    is_end: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    type: `WeiboAjaxStatusesCommentAst` = `WeiboAjaxStatusesCommentAst`
}
