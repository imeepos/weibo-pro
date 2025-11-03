import { Ast, Input, Node } from "@sker/workflow";


@Node()
export class WeiboAjaxStatusesMymblogAst extends Ast {

    @Input()
    uid: string = ``;

    @Input()
    page: number = 1;
}
