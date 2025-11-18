import { Ast, Node, Output, State } from "@sker/workflow";
import type { WeiboAccountEntity } from "@sker/entities";


@Node({ title: '微博登录' })
export class WeiboLoginAst extends Ast {

    @Output({ title: '微博账号' })
    account?: WeiboAccountEntity;

    @State({ title: '登录二维码' })
    qrcode?: string;

    @State({ title: '提示消息' })
    message?: string;

    type: `WeiboLoginAst` = `WeiboLoginAst`
}