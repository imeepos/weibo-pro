import { Ast, Node, Output } from "@sker/workflow";
import { Observable } from "rxjs";
import type { WeiboAccountEntity } from "@sker/entities";


@Node({ title: '微博登录' })
export class WeiboLoginAst extends Ast {

    @Output({ title: '登录事件流', isStream: true })
    events$?: Observable<any>;

    @Output({ title: '微博账号' })
    account?: WeiboAccountEntity;

    type: `WeiboLoginAst` = `WeiboLoginAst`
}