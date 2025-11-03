import { Ast, Input, Node, Output } from "@pro/workflow";
import type { WeiboPostEntity } from "@pro/entities";


export interface WeiboAjaxStatusesShowAstReponse extends WeiboPostEntity {
    ok: number;
}

@Node()
export class WeiboAjaxStatusesShowAst extends Ast {
    @Input()
    mblogid: string;

    @Output()
    @Input()
    uid: string;

    @Output()
    mid: string;

    type: `WeiboAjaxStatusesShowAst` = `WeiboAjaxStatusesShowAst`
}
