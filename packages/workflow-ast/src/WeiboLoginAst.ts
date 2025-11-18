import { Ast, Node, Output } from "@sker/workflow";
import type { WeiboAccountEntity } from "@sker/entities";
import { Observable } from 'rxjs';
import type { WeiboLoginEvent } from "@sker/workflow-run";


@Node({ title: '微博登录' })
export class WeiboLoginAst extends Ast {

    @Output({ title: '微博账号' })
    account?: WeiboAccountEntity;

    @Output({ title: '登录二维码' })
    qrcode?: string;

    /**
     * 登录事件流 Observable
     * 用于 SSE 推送登录状态
     */
    events$?: Observable<WeiboLoginEvent>;

    type: `WeiboLoginAst` = `WeiboLoginAst`
}