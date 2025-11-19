import { Ast, Input, Node, Output, State } from "@sker/workflow";

@Node({ title: "微博转发" })
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input({ title: "帖子ID" })
    mid: string = ``;

    @Input({ title: "用户ID" })
    uid: string = ``;

    @State({ title: "页码" })
    page: number = 1;

    @Output({ title: '结束' })
    is_end: boolean = false;

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}