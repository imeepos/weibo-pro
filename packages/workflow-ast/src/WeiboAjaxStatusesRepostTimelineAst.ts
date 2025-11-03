import { Ast, Input, Node } from "@sker/workflow";

@Node({ title: "微博转发" })
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input({ title: "消息ID" })
    mid: string = ``;

    @Input({ title: "页码" })
    page: number = 1;

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}