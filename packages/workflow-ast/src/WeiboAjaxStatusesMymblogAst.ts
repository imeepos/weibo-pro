import { Ast, Input, Node, Output, State } from "@sker/workflow";
import { BehaviorSubject } from 'rxjs';


@Node({
    title: "微博个人博文",
    type: 'crawler',
    errorStrategy: 'retry',
    maxRetries: 3,
    retryDelay: 2000,
    retryBackoff: 2
})
export class WeiboAjaxStatusesMymblogAst extends Ast {

    @Input({ title: "用户ID" })
    uid: string = ``;

    @State({ title: "页码" })
    page: number = 1;

    @Output({ title: '是否结束' })
    isEnd: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    type: `WeiboAjaxStatusesMymblogAst` = `WeiboAjaxStatusesMymblogAst`
}
