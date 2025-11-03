import { Ast, Input, Node } from "@sker/workflow";

@Node()
export class WeiboAjaxStatusesLikeShowAst extends Ast {

    @Input()
    mid: string = ``;
    @Input()
    page: number = 1;
    @Input()
    count: number = 20;
    /**
     * 默认值
     */
    @Input()
    attitude_type: number = 0;
    @Input()
    attitude_enable: number = 1;

    type: `WeiboAjaxStatusesLikeShowAst` = `WeiboAjaxStatusesLikeShowAst`
}