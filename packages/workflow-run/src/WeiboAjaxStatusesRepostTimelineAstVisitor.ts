import { Inject, Injectable } from "@sker/core";
import { useEntityManager, WeiboRepostEntity, WeiboUserEntity } from "@sker/entities";
import { WeiboAccountService } from "./weibo-account.service";
import { Handler } from "@sker/workflow";
import { WeiboAjaxStatusesRepostTimelineAst } from "@sker/workflow-ast";
import { delay } from "./utils";

export interface WeiboAjaxStatusesRepostTimelineResponse {
    readonly ok: number
    readonly data: WeiboRepostEntity[]
    readonly max_page: number
    readonly next_cursor: number
    readonly total_number: number;
}

@Injectable()
export class WeiboAjaxStatusesRepostTimelineAstVisitor {
    constructor(
        @Inject(WeiboAccountService) private account: WeiboAccountService,
    ) { }

    @Handler(WeiboAjaxStatusesRepostTimelineAst)
    async visit(ast: WeiboAjaxStatusesRepostTimelineAst, _ctx: any) {
        ast.state = 'running';
        while (ast.state === 'running') {
            ast = await this.fetch(ast, _ctx)
            ast.page = ast.page + 1;
            await delay()
        }
        return ast;
    }

    private async fetch(ast: WeiboAjaxStatusesRepostTimelineAst, _ctx: any) {
        const selection = await this.account.selectBestAccount();
        if (!selection) {
            ast.state = 'fail';
            console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] 没有可用账号`)
            return ast;
        }
        const cookies = selection.cookieHeader.split(';').map(it => it.split('=').map(it => it.trim()))
        const token = cookies.map(([name, value]) => {
            return { name, value }
        }).find((it) => {
            return it.name === `XSRF-TOKEN`
        })
        const referer = ast.uid
            ? `https://weibo.com/${ast.uid}/${ast.mid}`
            : `https://weibo.com/detail/${ast.mid}`;

        const response = await fetch(`https://weibo.com/ajax/statuses/repostTimeline?id=${ast.mid}&page=${ast.page}&moduleID=feed&count=10`, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'client-version': 'v2.47.129',
                'priority': 'u=1, i',
                'referer': referer,
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'server-version': 'v2025.10.24.3',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'x-requested-with': 'XMLHttpRequest',
                'x-xsrf-token': token?.value!,
                'cookie': selection.cookieHeader
            }
        });
        if (response.status === 200) {
            const body = await response.json() as WeiboAjaxStatusesRepostTimelineResponse;
            try {
                await useEntityManager(async m => {
                    const users = body.data.map(item => {
                        return m.create(WeiboUserEntity, item.user)
                    })
                    await m.upsert(WeiboUserEntity, users as any[], ['id'])
                    const entities = body.data.map(item => {
                        return m.create(WeiboRepostEntity, item)
                    });
                    console.log(`[WeiboAjaxStatusesRepostTimelineAstVisitor] ${ast.page} 页 共${entities.length}条数据`)
                    await m.upsert(WeiboRepostEntity, entities as any[], ['id'])
                    return entities;
                })
            } catch (error) {
                console.error(`[WeiboAjaxStatusesRepostTimelineAstVisitor] mid: ${ast.mid}`, error);
            }
            ast.state = body.data.length > 0 ? 'running' : 'success'
            return ast;
        }
        ast.state = 'fail'
        console.error(response.statusText)
        return ast;
    }
}