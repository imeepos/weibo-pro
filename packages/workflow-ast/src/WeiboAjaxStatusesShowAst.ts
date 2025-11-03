import { Ast, Input, Node, Output } from "@sker/workflow";

@Node()
export class WeiboAjaxStatusesShowAst extends Ast {
    @Input()
    mblogid: string = '';

    @Output()
    @Input()
    uid: string = '';

    @Output()
    mid: string = '';

    type: `WeiboAjaxStatusesShowAst` = `WeiboAjaxStatusesShowAst`
}
