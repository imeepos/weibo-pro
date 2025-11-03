import { Ast, Input } from "@sker/workflow";

export class WeiboAjaxFriendshipsAst extends Ast {

    @Input()
    uid: string = ``;

    @Input()
    page?: number = 1;
}
