import { Ast, Input, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';

@Node({
    title: "微博转发",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input({ title: "帖子ID" })
    mid: string = ``;

    @Input({ title: "用户ID" })
    uid: string = ``;

    @State({ title: "页码" })
    page: number = 1;

    @Output({ title: '结束' })
    is_end: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}