import { Ast, Input, Node, Output, State } from "@sker/workflow";

@Node({ title: '微博账号选择器' })
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
    cookies: string = ``;

    type: `WeiboAccountPickAst` = `WeiboAccountPickAst`
}