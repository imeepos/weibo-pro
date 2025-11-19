import { Ast, Input, Node, Output, State } from "@sker/workflow";


@Node({ title: "微博热门" })
export class WeiboAjaxFeedHotTimelineAst extends Ast {

    @State({ title: "组ID" })
    group_id: string = '102803600343';

    @State({ title: "容器ID" })
    containerid: string = '102803_ctg1_600343_-_ctg1_600343';

    @State({ title: "扩展参数" })
    extparam: string = 'discover|new_feed';

    @State({ title: "最大ID" })
    max_id: string = '0';

    @State({ title: "起始ID" })
    since_id: string = '0';

    @State({ title: "数量" })
    count: number = 10;

    @State({ title: "刷新" })
    refresh: number = 1;

    @Output({ title: '帖子短id' })
    mblogid: string = ``;

    @Output({ title: '用户id' })
    uid: string = ``;

    @Output({ title: '结束' })
    is_end: boolean = false;

    type: 'WeiboAjaxFeedHotTimelineAst' = 'WeiboAjaxFeedHotTimelineAst';
}