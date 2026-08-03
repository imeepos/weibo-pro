import { BrowserContext, Cookie, Page } from "playwright";
import { Subscriber } from "rxjs";
import { NodeEvent } from "@sker/workflow";
import { WeiboLoginAst } from "@sker/workflow-ast";
import { RedisClient } from "@sker/redis";
import { WeiboAccountEntity } from "@sker/entities";
import { WeiboUserInfo } from "./weibo-login.types";
import { extractUserInfo } from "./weibo-auth.user-info";
import { saveAccount } from "./weibo-auth.account";

/**
 * 页面导航监听器依赖的服务能力
 */
export interface WeiboAuthNavigationDeps {
  /** Redis 客户端，用于保存账号时更新健康度 */
  redis: RedisClient;
  /** 清理登录会话（由主服务注入） */
  cleanupSession: (sessionId: string) => Promise<void>;
}

/**
 * 设置 Response 监听器
 * 监听二维码生成和状态检查接口
 */
export function setupResponseListeners(
  page: Page,
  ast: WeiboLoginAst,
  obs: Subscriber<NodeEvent>
) {
  page.on('response', async (response) => {
    const url = response.url();

    try {
      // 监听二维码生成接口
      if (url.includes('qrcode/image')) {
        const data = await response.json();

        if (data.data?.image) {
          const apiBase = process.env.API_BASE_URL || 'http://localhost:8089';
          const proxyUrl = `${apiBase}/api/auth/proxy/qrcode?url=${encodeURIComponent(data.data.image)}`;
          ast.qrcode = proxyUrl;
          // 只发射 qrcode，让 ImageAst 节点显示二维码
          obs.next({ type: 'node_emit', id: ast.id, data: { qrcode: ast.qrcode } })
          // 不发射 account 事件，直到登录成功
        }
      }

      // 监听状态检查接口
      if (url.includes('qrcode/check')) {
        try {
          const data = await response.json();
          // 50114001: 未使用 (等待扫码)
          if (data.retcode === 50114001) {
            // 等待扫码状态
          }
          // 50114002: 已扫码,等待手机确认
          else if (data.retcode === 50114002) {
            ast.message = `请在手机点击确认以登录`
            obs.next({ type: 'node_emit', id: ast.id, data: { message: ast.message } })
            obs.next({ type: 'node_runing', id: ast.id })
          }
          // 50114003: 二维码过期，自动刷新
          else if (data.retcode === 50114003) {
            ast.message = `二维码已过期，正在刷新...`
            obs.next({ type: 'node_emit', id: ast.id, data: { message: ast.message } })
            obs.next({ type: 'node_runing', id: ast.id })
            page.reload({ waitUntil: 'networkidle' }).catch(() => {});
          }
        } catch (_e) {
          // 响应为空或无法解析，可能是登录成功后的空响应
        }
      }
    } catch (_error) {
      // 忽略响应处理错误
    }
  });
}

/**
 * 设置页面导航监听器
 * 检测登录成功后的页面跳转
 */
export function setupNavigationListeners(
  page: Page,
  context: BrowserContext,
  ast: WeiboLoginAst,
  obs: Subscriber<NodeEvent>,
  deps: WeiboAuthNavigationDeps,
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
        const userInfo = await extractUserInfo(page);

        // 保存到数据库
        const account = await saveAccount(deps.redis, ast.id, cookies, userInfo);

        ast.account = account;
        ast.state = 'success'
        obs.next({ type: 'node_emit', id: ast.id, data: { account: ast.account } })
        obs.next({ type: 'node_success', id: ast.id })
        obs.complete()
        await deps.cleanupSession(ast.id);
      } catch (_error) {
        ast.state = 'fail';
        ast.message = `保存账号信息失败`
        obs.next({ type: 'node_emit', id: ast.id, data: { message: ast.message } })
        obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
        obs.complete();
        await deps.cleanupSession(ast.id);
      }
    }
  });
}
