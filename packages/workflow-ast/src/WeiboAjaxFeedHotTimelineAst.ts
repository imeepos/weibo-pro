import { Ast, Input, Node } from "@sker/workflow";


@Node()
export class WeiboAjaxFeedHotTimelineAst extends Ast {

    @Input()
    group_id: string = '102803600343';

    @Input()
    containerid: string = '102803_ctg1_600343_-_ctg1_600343';

    @Input()
    extparam: string = 'discover%7Cnew_feed';

    @Input()
    max_id: string = '0';

    @Input()
    since_id: string = '0';

    @Input()
    count: number = 10;

    @Input()
    refresh: number = 1;

    type: 'WeiboAjaxFeedHotTimelineAst' = 'WeiboAjaxFeedHotTimelineAst';
}