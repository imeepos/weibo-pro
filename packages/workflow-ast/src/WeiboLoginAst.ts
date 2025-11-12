import { Ast, Input, Node, Output } from "@sker/workflow";
import { Observable } from "rxjs";
import { WeiboAccountEntity } from "@sker/entities";


@Node({ title: '微博登录' })
export class WeiboLoginAst extends Ast {

    @Input({ title: '用户ID' })
    userId: string = ``

    @Input({ title: '会话ID' })
    sessionId?: string;

    @Output({ title: '登录事件流' })
    events$?: Observable<any>;

    @Output({ title: '微博账号' })
    account?: WeiboAccountEntity;

    type: `WeiboLoginAst` = `WeiboLoginAst`
}