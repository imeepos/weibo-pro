import { Ast, Input, Node, Output } from "@sker/workflow";


@Node({ title: '微博检索' })
export class WeiboKeywordSearchAst extends Ast {

    @Input({ title: '关键字' })
    keyword: string = ``

    @Input({ title: '开始日期' })
    startDate: Date = new Date()

    @Input({ title: '结束日志' })
    endDate: Date = new Date();

    @Output({ title: '博文列表' })
    items: { uid: string, mblogid: string }[] = [];

    @Output({ title: '是否结束' })
    isEnd: boolean = false;
}
