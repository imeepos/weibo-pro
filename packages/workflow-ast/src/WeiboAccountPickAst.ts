import { Ast, Input, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';

@Node({
    title: '微博账号选择器',
    type: 'crawler',
    errorStrategy: 'abort',  // 无可用账号必须中断工作流
    maxRetries: 1,           // 选择失败仅重试 1 次
    retryDelay: 3000,
    retryBackoff: 1
})
export class WeiboAccountPickAst extends Ast {

    @Input({ title: '扫码登录', isMulti: true })
    scanQrCodeLogin: any[] = [];

    @State({ title: '账号列表' })
    list: Array<{
        id: number;
        nickname: string;
        avatar: string;
        healthScore: number;
        status: string;
    }> = [];

    @State({ title: '选中账号ID' })
    selectedId?: number;

    @Output({ title: 'Cookies' })
    cookies: BehaviorSubject<string> = new BehaviorSubject<string>(``);

    type: `WeiboAccountPickAst` = `WeiboAccountPickAst`
}