import { Inject, Injectable, NoRetryError } from "@sker/core";
import { Handler } from "@sker/workflow";
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
    const { userId, sessionId } = ast;

    if (!userId) {
      ast.state = 'fail';
      throw new NoRetryError('WeiboLoginAst 缺少必要参数: userId');
    }

    try {
      // 启动登录流程，获取事件流 Observable
      ast.events$ = await this.authService.startLogin(userId);
      ast.state = 'pending';

      // 订阅事件流，更新 AST 状态
      ast.events$.subscribe({
        next: (event) => {
          // 根据事件类型更新状态
          switch (event.type) {
            case 'qrcode':
              // 二维码生成，等待扫码
              break;
            case 'scanned':
              // 已扫码，等待确认
              break;
            case 'success':
              // 登录成功，更新账号信息
              ast.account = event.data;
              ast.state = 'success';
              break;
            case 'error':
            case 'expired':
              // 登录失败或过期
              ast.state = 'fail';
              break;
          }
        },
        error: (error) => {
          ast.state = `fail`;
          ast.setError(error, process.env.NODE_ENV === 'development');
        },
        complete: () => {
          // 事件流完成，如果状态还是 pending 则标记为完成
          if (ast.state === 'pending') {
            ast.state = 'success';
          }
        }
      });

      return ast;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      return ast;
    }
  }
}