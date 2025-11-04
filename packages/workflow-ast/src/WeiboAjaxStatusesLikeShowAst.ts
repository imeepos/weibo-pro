import { Ast, Input, Node, Output } from "@sker/workflow";

@Node({ title: "微博点赞" })
export class WeiboAjaxStatusesLikeShowAst extends Ast {

    @Input({ title: "消息ID" })
    mid: string = ``;
    @Input({ title: "页码" })
    page: number = 1;
    @Input({ title: "数量" })
    count: number = 20;
    /**
     * 默认值
     */
    @Input({ title: "态度类型" })
    attitude_type: number = 0;
    @Input({ title: "态度启用" })
    attitude_enable: number = 1;

    @Output({ title: '是否结束' })
    isEnd: boolean = false;

    type: `WeiboAjaxStatusesLikeShowAst` = `WeiboAjaxStatusesLikeShowAst`
}