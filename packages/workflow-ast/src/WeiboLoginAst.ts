import { Ast, Node, Output } from "@sker/workflow";
import type { WeiboAccountEntity } from "@sker/entities";


@Node({ title: '微博登录' })
export class WeiboLoginAst extends Ast {

    @Output({ title: '微博账号' })
    account?: WeiboAccountEntity;

    @Output({ title: '登录二维码' })
    qrcode?: string;

    @Output({ title: '提示消息' })
    message?: string;

    type: `WeiboLoginAst` = `WeiboLoginAst`
}