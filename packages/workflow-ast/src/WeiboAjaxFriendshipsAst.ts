import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: "微博关注", type: 'crawler' })
export class WeiboAjaxFriendshipsAst extends Ast {

    @Input({ title: "用户ID" })
    uid: string = ``;

    @Input({ title: "页码" })
    page?: number = 1;

    @Output({ title: '是否结束' })
    isEnd: boolean = false;

    type: `WeiboAjaxFriendshipsAst` = `WeiboAjaxFriendshipsAst`
}
