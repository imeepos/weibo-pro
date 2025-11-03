import { Ast, Input, Node } from "@sker/workflow";

@Node({ title: "微博个人信息" })
export class WeiboAjaxProfileInfoAst extends Ast {

    @Input({ title: "用户ID" })
    uid: string = ``;
}
