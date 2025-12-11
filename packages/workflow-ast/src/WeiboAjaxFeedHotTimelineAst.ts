import { Ast, Input, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';


@Node({
    title: "微博热门",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxFeedHotTimelineAst extends Ast {

    @Input({ isMulti: true, title: '开始' })
    next: boolean[] = [];

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
    mblogid: BehaviorSubject<string> = new BehaviorSubject<string>(``);

    @Output({ title: '用户id' })
    uid: BehaviorSubject<string> = new BehaviorSubject<string>(``);

    @Output({ title: '结束' })
    is_end: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    type: 'WeiboAjaxFeedHotTimelineAst' = 'WeiboAjaxFeedHotTimelineAst';
}