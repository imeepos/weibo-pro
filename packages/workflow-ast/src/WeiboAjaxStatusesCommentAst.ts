import { Ast, Input, Node, Output } from "@sker/workflow";
import type {WeiboCommentEntity} from '@sker/entities'


@Node()
export class WeiboAjaxStatusesCommentAst extends Ast {

    @Input()
    mid!: string;

    @Input()
    uid!: string;

    // 默认
    @Input()
    max_id: number | undefined = undefined;

    @Input()
    count: number = 20;

    @Input()
    is_show_bulletin: number = 3;

    @Input()
    is_mix: number = 0;

    @Input()
    fetch_level: number = 0;

    @Output()
    next_max_id: number = 0;

    @Output()
    entities: WeiboCommentEntity[] = [];

    type: `WeiboAjaxStatusesCommentAst` = `WeiboAjaxStatusesCommentAst`
}
