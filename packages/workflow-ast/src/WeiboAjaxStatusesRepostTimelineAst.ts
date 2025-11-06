import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: "微博转发" })
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input({ title: "消息ID" })
    mid: string = ``;

    @Input({ title: "用户ID" })
    uid: string = ``;

    @Input({ title: "页码" })
    page: number = 1;

    @Output({ title: '是否结束' })
    isEnd: boolean = false;

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}