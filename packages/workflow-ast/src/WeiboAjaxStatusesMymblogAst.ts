import { Ast, Input, Node, Output, State } from "@sker/workflow";


@Node({ title: "微博个人博文", type: 'crawler' })
export class WeiboAjaxStatusesMymblogAst extends Ast {

    @Input({ title: "用户ID" })
    uid: string = ``;

    @State({ title: "页码" })
    page: number = 1;

    @Output({ title: '是否结束' })
    isEnd: boolean = false;

    type: `WeiboAjaxStatusesMymblogAst` = `WeiboAjaxStatusesMymblogAst`
}
