import { Ast, Node, Output, State } from "@sker/workflow";
import type { WeiboAccountEntity } from "@sker/entities";
import { BehaviorSubject } from 'rxjs';

/**
 * 我需要重新设计 WeiboLoginAst
 * 
 * 充分利用 output 可以发射流给下一个节点的特性 1. 发射二维码登录事件给下一个节点 2.
  下一个节点显示二维码 3. 用户扫码后，监控到发射成功或失败 4. 超时发射超时  记得参考之前的逻辑 之前的逻辑是调试好的


 */


@Node({
    title: '微博登录',
    type: 'crawler',
    errorStrategy: 'abort',  // 登录失败必须中断工作流
    maxRetries: 2,           // 仅重试 2 次（扫码登录不应频繁重试）
    retryDelay: 5000,
    retryBackoff: 1
})
export class WeiboLoginAst extends Ast {

    @Output({ title: '微博账号', isRouter: true })
    account: BehaviorSubject<WeiboAccountEntity | undefined> = new BehaviorSubject<WeiboAccountEntity | undefined>(undefined);

    @Output({ title: '登录二维码', isRouter: true })
    qrcode: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    @Output({ title: '提示消息' })
    message: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    type: `WeiboLoginAst` = `WeiboLoginAst`
}