import { Ast, Input, Node } from "@sker/workflow";

@Node()
export class WeiboAjaxStatusesRepostTimelineAst extends Ast {

    @Input()
    mid: string = ``;

    @Input()
    page: number = 1;

    type: `WeiboAjaxStatusesRepostTimelineAst` = `WeiboAjaxStatusesRepostTimelineAst`

}