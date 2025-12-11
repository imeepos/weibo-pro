import { Ast, Node, Output, State } from "@sker/workflow";
import type { WeiboAccountEntity } from "@sker/entities";


@Node({
    title: '微博登录',
    type: 'crawler',
    errorStrategy: 'abort',  // 登录失败必须中断工作流
    maxRetries: 2,           // 仅重试 2 次（扫码登录不应频繁重试）
    retryDelay: 5000,
    retryBackoff: 1
})
export class WeiboLoginAst extends Ast {

    @Output({ title: '微博账号' })
    account?: WeiboAccountEntity;

    @State({ title: '登录二维码' })
    qrcode?: string;

    @State({ title: '提示消息' })
    message?: string;

    type: `WeiboLoginAst` = `WeiboLoginAst`
}