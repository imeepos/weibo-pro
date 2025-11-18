import { Inject, Injectable } from "@sker/core";
import { generateId, Handler } from "@sker/workflow";
import { WeiboLoginAst } from "@sker/workflow-ast";
import { WeiboAuthService } from "./weibo-auth.service";

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
  async handler(ast: WeiboLoginAst, ctx: any): Promise<WeiboLoginAst> {
    try {
      // 自动生成匿名用户ID，不依赖外部输入
      const anonymousUserId = generateId();

      // 启动登录流程，获取事件流 Observable
      ast.events$ = await this.authService.startLogin(anonymousUserId);
      ast.state = 'pending';

      return ast;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      return ast;
    }
  }
}