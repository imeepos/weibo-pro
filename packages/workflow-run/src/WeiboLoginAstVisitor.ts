import { Inject, Injectable } from "@sker/core";
import { Handler, INode } from "@sker/workflow";
import { WeiboLoginAst } from "@sker/workflow-ast";
import { WeiboAuthService } from "./services/weibo-auth.service";
import { Observable } from 'rxjs'

/**
 * 微博登录 AST 节点执行器
 * 负责启动微博扫码登录流程，提供 RxJS 事件流接口
 */
@Injectable()
export class WeiboLoginAstVisitor {

  constructor(
    @Inject(WeiboAuthService) private authService: WeiboAuthService
  ) { }

  @Handler(WeiboLoginAst)
  handler(ast: WeiboLoginAst, ctx: any): Observable<INode> {
    return new Observable<INode>(obs => {
      this.authService.startLogin(ast, obs)
    })
  }
}