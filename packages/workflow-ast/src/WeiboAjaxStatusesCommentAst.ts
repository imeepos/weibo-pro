import { Ast, Input, Node, Output } from "@sker/workflow";
import type {WeiboCommentEntity} from '@sker/entities'


@Node({ title: "微博评论" })
export class WeiboAjaxStatusesCommentAst extends Ast {

    @Input({ title: "消息ID" })
    mid!: string;

    @Input({ title: "用户ID" })
    uid!: string;

    // 默认
    @Input({ title: "最大ID" })
    max_id: number | undefined = undefined;

    @Input({ title: "数量" })
    count: number = 20;

    @Input({ title: "显示公告" })
    is_show_bulletin: number = 3;

    @Input({ title: "混合模式" })
    is_mix: number = 0;

    @Input({ title: "获取级别" })
    fetch_level: number = 0;

    @Output({ title: "下一最大ID" })
    next_max_id: number = 0;

    @Output({ title: "评论实体" })
    entities: WeiboCommentEntity[] = [];

    type: `WeiboAjaxStatusesCommentAst` = `WeiboAjaxStatusesCommentAst`
}
