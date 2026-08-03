import { Page } from "playwright";
import { WeiboUserInfo } from "./weibo-login.types";

/**
 * 从页面提取微博用户信息
 * 从 window.$CONFIG.user 获取用户数据
 * @param page Playwright 页面
 */
export async function extractUserInfo(page: Page): Promise<WeiboUserInfo> {
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
    } catch (_e) {
      // 忽略解析失败
    }

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
