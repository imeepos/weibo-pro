import { Ast, Input, Node, Output, State } from "@sker/workflow";

@Node({
    title: '代理自动选择',
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class ProxyAutoSelectAst extends Ast {

    @Input({ title: '初始化数量', defaultValue: 2 })
    initialCount: number = 2;

    @State({ title: '代理列表' })
    proxyList: Array<{
        url: string;
        provider: string;
        expiresAt: number;
        useCount: number;
    }> = [];

    @State({ title: '选中代理URL' })
    selectedProxyUrl?: string;

    @Output({ title: '代理URL', defaultValue: '' })
    proxyUrl = '';

    @Output({ title: '代理信息', defaultValue: null })
    proxyInfo: {
        url: string;
        provider: string;
        expiresAt: number;
    } | null = null;

    type = 'ProxyAutoSelectAst';
}
