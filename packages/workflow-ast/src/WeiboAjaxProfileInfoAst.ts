import { Ast, Input } from "@sker/workflow";

export class WeiboAjaxProfileInfoAst extends Ast {

    @Input()
    uid: string = ``;
}
