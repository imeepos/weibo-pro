import { Ast, Input, Node, Output, State } from "@sker/workflow";


@Node({ title: '微博检索' })
export class WeiboKeywordSearchAst extends Ast {

    @Input({ title: '关键字', type: 'text' })
    keyword: string = ``

    @Input({ title: '开始日期', type: 'date' })
    startDate: Date = new Date()

    @State({ title: '结束日期', type: 'date' })
    endDate: Date = new Date();

    @State({ title: '页码', type: 'number' })
    page: number = 1;

    @Input({ title: '发射最小延迟(秒)', type: 'number' })
    emitDelayMin: number = 1;

    @Input({ title: '发射最大延迟(秒)', type: 'number' })
    emitDelayMax: number = 3;

    @Input({ title: '翻页最小延迟(秒)', type: 'number' })
    pageDelayMin: number = 3;

    @Input({ title: '翻页最大延迟(秒)', type: 'number' })
    pageDelayMax: number = 5;

    @Output({ title: '帖子id' })
    mblogid: string = ``

    @Output({ title: '用户id' })
    uid: string = ``


    @Output({ title: '是否结束' })
    isEnd: boolean = false;

    @State({ title: '当前页码' })
    currentPage: number = 1;

    @State({ title: '总页数' })
    totalPages: number = 1;

    type: `WeiboKeywordSearchAst` = `WeiboKeywordSearchAst`
}
