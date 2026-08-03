import { Inject, Injectable, OnDestroy } from "@sker/core";
import { Browser } from "playwright";
import { RedisClient } from "@sker/redis";
import { WeiboLoginAst } from "@sker/workflow-ast";
import { Subscriber } from 'rxjs'
import { NodeEvent } from "@sker/workflow";
import { LoginSession, WeiboLoginConfig } from "./weibo-login.types";
import { launchBrowser } from "./weibo-auth.browser";
import { createSessionInRedis, updateSessionStatusInRedis } from "./weibo-auth.redis";
import { setupResponseListeners, setupNavigationListeners } from "./weibo-auth.listeners";

/**
 * 微博登录认证服务
 * 使用 Playwright 控制浏览器完成扫码登录流程
 * 提供 RxJS 事件流接口供外部调用者订阅处理
 *
 * 职责拆分：
 * - 浏览器启动：weibo-auth.browser.ts
 * - Redis 会话存储：weibo-auth.redis.ts
 * - 用户信息提取：weibo-auth.user-info.ts
 * - 账号保存：weibo-auth.account.ts
 * - 页面监听器：weibo-auth.listeners.ts
 */
@Injectable()
export class WeiboAuthService implements OnDestroy {
  private browser: Browser | null = null;
  private browserInitPromise: Promise<void> | null = null;
  private loginSessions = new Map<string, LoginSession>();

  // 登录会话配置
  private readonly config: WeiboLoginConfig = {
    sessionTimeout: 5 * 60 * 1000, // 5分钟
    loginUrl: 'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup' +
      '&url=https%3A%2F%2Fweibo.com%2Fnewlogin%3Ftabtype%3Dweibo%26gid%3D102803%26openLoginLayer%3D0%26url%3Dhttps%253A%252F%252Fweibo.com%252F' +
      '&from=weibopro',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    headless: true
  };

  constructor(
    @Inject(RedisClient) private redis: RedisClient
  ) {
    this.browserInitPromise = this.initBrowser();
  }

  /**
   * 初始化 Playwright 浏览器实例
   *
   * 优雅设计：
   * - 延迟初始化，避免阻塞服务启动
   * - 失败时不影响整体应用启动
   * - 记录详细日志便于诊断
   */
  private async initBrowser(): Promise<void> {
    try {
      this.browser = await launchBrowser(this.config.headless);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Playwright 浏览器初始化失败: ${errorMessage}. 微博登录功能将不可用。`);
    }
  }

  /**
   * 启动微博登录流程
   * @param userId 用户 ID
   * @returns Observable 事件流
   */
  async startLogin(ast: WeiboLoginAst, obs: Subscriber<NodeEvent>): Promise<void> {
    // 确保浏览器已初始化
    if (this.browserInitPromise) {
      await this.browserInitPromise;
    }
    await this.createLoginSession(ast, obs)
  }

  /**
   * 创建登录会话
   */
  async createLoginSession(
    ast: WeiboLoginAst, obs: Subscriber<NodeEvent>
  ): Promise<void> {
    if (!this.browser) {
      throw new Error('Playwright浏览器未就绪，微博登录功能暂时不可用');
    }

    // 首先在 Redis 中创建会话记录
    const sessionData = await createSessionInRedis(this.redis, ast.id, this.config.sessionTimeout);
    const { sessionId, expiresAt } = sessionData;

    const context = await this.browser.newContext({
      userAgent: this.config.userAgent,
    });

    const page = await context.newPage();
    const createdAt = new Date();

    const session: LoginSession = {
      sessionId,
      userId: ast.id,
      subject: obs,
      context,
      page,
      createdAt,
      expiresAt,
    };

    this.loginSessions.set(sessionId, session);

    // 设置超时定时器
    const timer = setTimeout(() => {
      ast.message = `登录超时,请重新尝试`
      ast.state = 'fail'
      obs.next({ type: 'node_emit', id: ast.id, data: { message: ast.message } })
      obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
      this.cleanupSession(sessionId);
    }, this.config.sessionTimeout);

    session.timer = timer;

    // 设置事件监听器
    setupResponseListeners(page, ast, obs);
    setupNavigationListeners(page, context, ast, obs, {
      redis: this.redis,
      cleanupSession: (id) => this.cleanupSession(id),
    });

    // 启动登录流程
    setImmediate(async () => {
      try {
        await page.goto(this.config.loginUrl, { waitUntil: 'networkidle' });

        try {
          await page.waitForSelector('img[src*="qrcode"]', { timeout: 10000 });
        } catch (_e) {
          // 未找到二维码元素，继续流程
        }
      } catch (error) {
        console.error('[WeiboAuthService] 导航失败:', error);
        ast.state = 'fail'
        ast.message = `打开登录页面失败`
        obs.next({ type: 'node_emit', id: ast.id, data: { message: ast.message } })
        obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
        await this.cleanupSession(sessionId);
      }
    });
  }

  /**
   * 取消登录会话（公共方法，供外部调用）
   */
  cancelSession(sessionId: string): void {
    this.cleanupSession(sessionId).catch(error => {
      console.error(`[WeiboAuthService] 清理会话失败: ${sessionId}`, error);
    });
  }

  /**
   * 清理登录会话
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.loginSessions.get(sessionId);
    if (!session) return;

    // 先从Map中移除，防止新的订阅
    this.loginSessions.delete(sessionId);

    // 清除定时器
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = undefined;
    }

    // 最后才关闭Subject，确保所有事件都能推送完
    try {
      if (!session.subject.closed) {
        // 延迟一点时间再关闭，确保事件被推送
        setTimeout(() => {
          if (!session.subject.closed) {
            session.subject.complete();
          }
        }, 100);
      }
    } catch (_error) {
      // 忽略关闭错误
    }

    // 关闭浏览器上下文
    try {
      await session.context.close();
    } catch (_error) {
      // 忽略关闭错误
    }

    // 更新 Redis 中的会话状态
    try {
      await updateSessionStatusInRedis(this.redis, sessionId, 'completed');
    } catch (_error) {
      // 忽略更新错误
    }
  }

  /**
   * 生命周期销毁方法
   */
  async onDestroy() {
    // 关闭所有活动会话
    for (const [sessionId, _session] of this.loginSessions.entries()) {
      await this.cleanupSession(sessionId);
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
