import { Inject, Injectable, OnDestroy } from "@sker/core";
import { Subject, Observable } from "rxjs";
import { chromium, Browser, BrowserContext, Page, Cookie } from "playwright";
import { RedisClient } from "@sker/redis";
import { WeiboAccountEntity, WeiboAccountStatus, useEntityManager } from "@sker/entities";
import {
  WeiboLoginEvent,
  WeiboLoginEventType,
  LoginSession,
  WeiboUserInfo,
  WeiboLoginSessionSnapshot,
  SessionStorage,
  WeiboLoginConfig
} from "./weibo-login.types";
import { generateId } from "@sker/workflow";

/**
 * 微博登录认证服务
 * 使用 Playwright 控制浏览器完成扫码登录流程
 * 提供 RxJS 事件流接口供外部调用者订阅处理
 */
@Injectable()
export class WeiboAuthService implements OnDestroy {
  private browser: Browser | null = null;
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
  ) {}

  /**
   * 启动微博登录流程
   * @param userId 用户 ID
   * @returns Observable 事件流
   */
  async startLogin(userId: string): Promise<Observable<WeiboLoginEvent>> {
    try {
      const { events$ } = await this.createLoginSession(userId);
      return events$;
    } catch (error) {
      const subject = new Subject<WeiboLoginEvent>();
      subject.next({
        type: 'error',
        data: { message: (error as any)?.message || '微博登录暂时不可用' },
        sessionId: '',
        timestamp: new Date()
      });
      subject.complete();
      return subject.asObservable();
    }
  }

  /**
   * 创建登录会话
   */
  async createLoginSession(
    userId: string,
  ): Promise<{ sessionId: string; expiresAt: Date; events$: Observable<WeiboLoginEvent> }> {
    if (!this.browser) {
      throw new Error('Playwright浏览器未就绪，微博登录功能暂时不可用');
    }

    // 首先在 Redis 中创建会话记录
    const sessionData = await this.createSessionInRedis(userId);
    const { sessionId, expiresAt } = sessionData;

    const context = await this.browser.newContext({
      userAgent: this.config.userAgent,
    });

    const page = await context.newPage();
    const subject = new Subject<WeiboLoginEvent>();
    const createdAt = new Date();

    const session: LoginSession = {
      sessionId,
      userId,
      subject,
      context,
      page,
      createdAt,
      expiresAt,
    };

    // 订阅事件并同步到 Redis
    session.eventsSubscription = subject.subscribe({
      next: async (event) => {
        session.lastEvent = event;
        await this.updateSessionEventInRedis(sessionId, event);
      },
      error: async (error) => {
        await this.updateSessionStatusInRedis(sessionId, 'expired');
      },
      complete: async () => {
        await this.updateSessionStatusInRedis(sessionId, 'completed');
      }
    });

    this.loginSessions.set(sessionId, session);

    // 设置超时定时器
    const timer = setTimeout(() => {
      subject.next({
        type: 'error',
        data: { message: '登录超时,请重新尝试' },
        sessionId,
        timestamp: new Date()
      });
      subject.complete();
      this.cleanupSession(sessionId);
    }, this.config.sessionTimeout);

    session.timer = timer;

    // 设置事件监听器
    this.setupResponseListeners(page, subject, sessionId, userId);
    this.setupNavigationListeners(page, context, subject, sessionId, userId);

    // 启动登录流程
    setImmediate(async () => {
      try {
        await page.goto(this.config.loginUrl, { waitUntil: 'networkidle' });

        try {
          await page.waitForSelector('img[src*="qrcode"]', { timeout: 10000 });
        } catch (e) {
          // 二维码元素加载超时，继续流程
        }
      } catch (error) {
        subject.next({
          type: 'error',
          data: { message: '打开登录页面失败' },
          sessionId,
          timestamp: new Date()
        });
        subject.complete();
        await this.cleanupSession(sessionId);
      }
    });

    return {
      sessionId,
      expiresAt,
      events$: subject.asObservable(),
    };
  }

  /**
   * 设置 Response 监听器
   * 监听二维码生成和状态检查接口
   */
  private setupResponseListeners(
    page: Page,
    subject: Subject<WeiboLoginEvent>,
    sessionId: string,
    userId: string,
  ) {
    page.on('response', async (response) => {
      const url = response.url();

      try {
        // 监听二维码生成接口
        if (url.includes('qrcode/image')) {
          const data = await response.json();

          if (data.data?.image) {
            subject.next({
              type: 'qrcode',
              data: {
                qrid: data.data.qrid,
                image: data.data.image,
              },
              sessionId,
              timestamp: new Date()
            });
          }
        }

        // 监听状态检查接口
        if (url.includes('qrcode/check')) {
          try {
            const data = await response.json();

            // 推送状态事件
            subject.next({
              type: 'status',
              data: {
                retcode: data.retcode,
                msg: data.msg,
                data: data.data,
              },
              sessionId,
              timestamp: new Date()
            });

            // 50114001: 未使用 (等待扫码)
            if (data.retcode === 50114001) {
              // 等待扫码状态
            }

            // 50114002: 已扫码,等待手机确认
            else if (data.retcode === 50114002) {
              subject.next({
                type: 'scanned',
                data: { message: '成功扫描,请在手机点击确认以登录' },
                sessionId,
                timestamp: new Date()
              });
            }

            // 50114003: 二维码过期
            else if (data.retcode === 50114003) {
              subject.next({
                type: 'expired',
                data: { message: '该二维码已过期,请重新扫描' },
                sessionId,
                timestamp: new Date()
              });
              subject.complete();
              await this.cleanupSession(sessionId);
            }
          } catch (e) {
            // 响应为空或无法解析，可能是登录成功后的空响应
          }
        }
      } catch (error) {
        // 忽略响应处理错误
      }
    });
  }

  /**
   * 设置页面导航监听器
   * 检测登录成功后的页面跳转
   */
  private setupNavigationListeners(
    page: Page,
    context: BrowserContext,
    subject: Subject<WeiboLoginEvent>,
    sessionId: string,
    userId: string,
  ) {
    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;

      const url = frame.url();

      // 检测登录成功: 页面跳转到微博首页
      if (url.startsWith('https://weibo.com/')) {
        try {
          // 提取 Cookie
          const cookies = await context.cookies();

          // 提取用户信息
          const userInfo = await this.extractUserInfo(page);

          // 保存到数据库
          const account = await this.saveAccount(userId, cookies, userInfo);

          // 推送成功事件
          subject.next({
            type: 'success',
            data: {
              accountId: account.id,
              weiboUid: account.weiboUid,
              weiboNickname: account.weiboNickname,
              weiboAvatar: account.weiboAvatar,
            },
            sessionId,
            timestamp: new Date()
          });

          subject.complete();
          await this.cleanupSession(sessionId);
        } catch (error) {
          subject.next({
            type: 'error',
            data: { message: '保存账号信息失败' },
            sessionId,
            timestamp: new Date()
          });
          subject.complete();
          await this.cleanupSession(sessionId);
        }
      }
    });
  }

  /**
   * 从页面提取微博用户信息
   * 从 window.$CONFIG.user 获取用户数据
   */
  private async extractUserInfo(page: Page): Promise<WeiboUserInfo> {
    // 等待页面完全加载
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      // 忽略超时
    });

    // 等待一小段时间让 JS 执行
    await page.waitForTimeout(2000);

    // 尝试多种方式获取用户信息
    const userInfo = await page.evaluate(() => {
      type WeiboUserSnapshot = {
        id?: number;
        idstr?: string;
        screen_name?: string;
        avatar_hd?: string;
      };

      type WeiboGlobal = typeof window & {
        $CONFIG?: { user?: WeiboUserSnapshot };
        $render_data?: { user?: WeiboUserSnapshot };
      };

      const globalWindow = window as WeiboGlobal;

      // 方式1: window.$CONFIG
      const config = globalWindow.$CONFIG;
      if (config?.user?.id) {
        return {
          id: config.user.id,
          idstr: config.user.idstr,
          screen_name: config.user.screen_name,
          avatar_hd: config.user.avatar_hd,
          source: '$CONFIG'
        };
      }

      // 方式2: window.$render_data
      const renderData = globalWindow.$render_data;
      if (renderData?.user?.id) {
        return {
          id: renderData.user.id,
          idstr: renderData.user.idstr,
          screen_name: renderData.user.screen_name,
          avatar_hd: renderData.user.avatar_hd,
          source: '$render_data'
        };
      }

      // 方式3: localStorage
      try {
        const storageUser = localStorage.getItem('weiboUserInfo');
        if (storageUser) {
          const user = JSON.parse(storageUser);
          if (user.id) {
            return {
              id: user.id,
              idstr: user.idstr,
              screen_name: user.screen_name,
              avatar_hd: user.avatar_hd,
              source: 'localStorage'
            };
          }
        }
      } catch (e) {}

      // 方式4: 从页面元素提取
      const avatarImg = document.querySelector('[class*="AvatarImg"]') as HTMLImageElement;
      const nicknameEl = document.querySelector('[class*="nick_name"]');

      return {
        id: null,
        idstr: null,
        screen_name: nicknameEl?.textContent || null,
        avatar_hd: avatarImg?.src || null,
        source: 'dom'
      };
    });

    if (!userInfo.id) {
      throw new Error(`无法提取用户信息`);
    }

    return {
      uid: userInfo.idstr || userInfo.id.toString(),
      nickname: userInfo.screen_name || `微博用户_${userInfo.idstr}`,
      avatar: userInfo.avatar_hd || '',
    };
  }

  /**
   * 保存微博账号到数据库
   */
  private async saveAccount(
    userId: string,
    cookies: Cookie[],
    userInfo: WeiboUserInfo,
  ): Promise<WeiboAccountEntity> {
    return useEntityManager(async (m) => {
      const repo = m.getRepository(WeiboAccountEntity);

      // 检查是否已存在
      const existing = await repo.findOne({
        where: { weiboUid: userInfo.uid },
      });

      let savedAccount: WeiboAccountEntity;

      if (existing) {
        // 更新现有账号
        existing.weiboNickname = userInfo.nickname;
        existing.weiboAvatar = userInfo.avatar;
        existing.cookies = JSON.stringify(cookies);
        existing.status = WeiboAccountStatus.ACTIVE;
        existing.lastCheckAt = new Date();

        savedAccount = await repo.save(existing);
      } else {
        // 创建新账号
        const account = repo.create({
          weiboUid: userInfo.uid,
          weiboNickname: userInfo.nickname,
          weiboAvatar: userInfo.avatar,
          cookies: JSON.stringify(cookies),
          status: WeiboAccountStatus.ACTIVE,
          lastCheckAt: new Date(),
        });

        savedAccount = await repo.save(account);
      }

      return savedAccount;
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

    // 清理内部事件订阅
    try {
      session.eventsSubscription?.unsubscribe();
    } catch (error) {
      // 忽略清理错误
    }

    // 最后才关闭Subject，确保所有事件都能推送完
    try {
      if (!session.subject.closed) {
        // 推送一个会话结束事件
        session.subject.next({
          type: 'expired',
          data: { message: '登录会话已结束' },
          sessionId,
          timestamp: new Date()
        });

        // 延迟一点时间再关闭，确保事件被推送
        setTimeout(() => {
          if (!session.subject.closed) {
            session.subject.complete();
          }
        }, 100);
      }
    } catch (error) {
      // 忽略关闭错误
    }

    // 关闭浏览器上下文
    try {
      await session.context.close();
    } catch (error) {
      // 忽略关闭错误
    }

    // 更新 Redis 中的会话状态
    try {
      await this.updateSessionStatusInRedis(sessionId, 'completed');
    } catch (error) {
      // 忽略更新错误
    }
  }

  /**
   * 生命周期销毁方法
   */
  async onDestroy() {
    // 关闭所有活动会话
    for (const [sessionId, session] of this.loginSessions.entries()) {
      await this.cleanupSession(sessionId);
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Redis 会话存储方法
   */
  private async createSessionInRedis(userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + this.config.sessionTimeout);

    const sessionData = {
      userId,
      expiresAt: expiresAt.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await this.redis.set(`weibo_session:${sessionId}`, sessionData, Math.ceil(this.config.sessionTimeout / 1000));

    return { sessionId, expiresAt };
  }

  private async updateSessionEventInRedis(sessionId: string, event: WeiboLoginEvent): Promise<void> {
    const key = `weibo_session:${sessionId}`;
    const sessionDataStr = await this.redis.get(key);

    if (sessionDataStr) {
      const sessionData = JSON.parse(sessionDataStr);
      sessionData.lastEvent = event;
      await this.redis.set(key, JSON.stringify(sessionData));
    }
  }

  private async updateSessionStatusInRedis(sessionId: string, status: string): Promise<void> {
    const key = `weibo_session:${sessionId}`;
    const sessionDataStr = await this.redis.get(key);

    if (sessionDataStr) {
      const sessionData = JSON.parse(sessionDataStr);
      sessionData.status = status;
      await this.redis.set(key, JSON.stringify(sessionData));
    }
  }
}