import { Ast, Input, Node } from "@sker/workflow";


@Node({ title: "微博热门" })
export class WeiboAjaxFeedHotTimelineAst extends Ast {

    @Input({ title: "组ID" })
    group_id: string = '102803600343';

    @Input({ title: "容器ID" })
    containerid: string = '102803_ctg1_600343_-_ctg1_600343';

    @Input({ title: "扩展参数" })
    extparam: string = 'discover%7Cnew_feed';

    @Input({ title: "最大ID" })
    max_id: string = '0';

    @Input({ title: "起始ID" })
    since_id: string = '0';

    @Input({ title: "数量" })
    count: number = 10;

    @Input({ title: "刷新" })
    refresh: number = 1;

    type: 'WeiboAjaxFeedHotTimelineAst' = 'WeiboAjaxFeedHotTimelineAst';
}