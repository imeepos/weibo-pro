import { Ast, Input, Node, Output, State } from "@sker/workflow";

/**
 * @deprecated 使用 HttpRequestAst 替代
 *
 * 迁移示例：
 * ```typescript
 * // 旧节点
 * WeiboKeywordSearchAst { keyword: '热搜' }
 *
 * // 新节点（使用 HttpRequestAst）
 * HttpRequestAst {
 *   method: 'GET',
 *   urlTemplate: 'https://weibo.com/ajax/side/search',
 *   queryParams: { q: '{{keyword}}', page: '{{page}}' },
 *   headers: { Cookie: '{{cookie}}' }
 * }
 * ```
 *
 * 或使用配置模板：templates/weibo-keyword-search.json
 */
@Node({
    title: '微博检索',
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboKeywordSearchAst extends Ast {

    @Input({ title: '关键字', type: 'text', defaultValue: '' })
    keyword: string = ``

    @Input({ title: '开始日期', type: 'date', defaultValue: new Date() })
    startDate: Date = new Date()

    @State({ title: '结束日期', type: 'date' })
    endDate: Date = new Date();

    @State({ title: '页码', type: 'number' })
    page: number = 1;

    @Input({ title: '发射最小延迟(秒)', type: 'number', defaultValue: 1 })
    emitDelayMin: number = 1;

    @Input({ title: '发射最大延迟(秒)', type: 'number', defaultValue: 3 })
    emitDelayMax: number = 3;

    @Input({ title: '翻页最小延迟(秒)', type: 'number', defaultValue: 3 })
    pageDelayMin: number = 3;

    @Input({ title: '翻页最大延迟(秒)', type: 'number', defaultValue: 5 })
    pageDelayMax: number = 5;

    @Output({ title: '帖子id', defaultValue: '' })
    mblogid = ''

    @Output({ title: '用户id', defaultValue: '' })
    uid = ''


    @Output({ title: '是否结束', defaultValue: false })
    isEnd = false;

    @State({ title: '当前页码' })
    currentPage: number = 1;

    @State({ title: '总页数' })
    totalPages: number = 1;

    type: `WeiboKeywordSearchAst` = `WeiboKeywordSearchAst`
}
