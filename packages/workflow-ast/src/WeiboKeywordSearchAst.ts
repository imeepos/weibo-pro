import { Ast, Input, Node, Output } from "@sker/workflow";


@Node({ title: '微博检索' })
export class WeiboKeywordSearchAst extends Ast {

    @Input({ title: '关键字', type: 'text' })
    keyword: string = ``

    @Input({ title: '开始日期', type: 'date' })
    startDate: Date = new Date()

    @Input({ title: '结束日期', type: 'date' })
    endDate: Date = new Date();

    @Input({ title: '页码', type: 'number' })
    page: number = 1;

    @Output({ title: '博文列表' })
    items: { uid: string, mblogid: string }[] = [];

    @Output({ title: '是否结束' })
    isEnd: boolean = false;

    type: `WeiboKeywordSearchAst` = `WeiboKeywordSearchAst`
}
