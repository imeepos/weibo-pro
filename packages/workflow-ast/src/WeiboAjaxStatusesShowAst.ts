import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: "微博博文详情" })
export class WeiboAjaxStatusesShowAst extends Ast {
    @Input({ title: "微博ID" })
    mblogid: string = '';

    @Output({ title: "用户ID" })
    @Input({ title: "用户ID" })
    uid: string = '';

    @Output({ title: "消息ID" })
    mid: string = '';

    type: `WeiboAjaxStatusesShowAst` = `WeiboAjaxStatusesShowAst`
}
