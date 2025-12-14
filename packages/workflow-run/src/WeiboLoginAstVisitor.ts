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
      ast.count += 1;
      ast.state = 'running';
      obs.next({...ast})

      this.authService.startLogin(ast, obs)
      // 清理逻辑：取消订阅时清理登录会话
      return () => {
        console.log('[WeiboLoginAstVisitor] 订阅被取消，清理登录会话');
        this.authService.cancelSession(ast.id);
        obs.complete();
      };
    })
  }
}