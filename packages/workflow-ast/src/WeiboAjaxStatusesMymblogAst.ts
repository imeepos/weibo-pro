import { Ast, Input, Node } from "@sker/workflow";


@Node({ title: "微博个人博文" })
export class WeiboAjaxStatusesMymblogAst extends Ast {

    @Input({ title: "用户ID" })
    uid: string = ``;

    @Input({ title: "页码" })
    page: number = 1;
}
