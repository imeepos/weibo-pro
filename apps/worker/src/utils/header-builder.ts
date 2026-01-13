import type { ProxyRequest, WeiboProxyRequest } from '../types';
import { CookieParser } from './cookie-parser';

/**
 * 版本信息
 */
const VERSION_INFO = {
  clientVersion: 'v2.47.129',
  serverVersion: 'v2025.10.24.3',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
} as const;

/**
 * 请求头构造器
 */
export class HeaderBuilder {
  /**
   * 构造通用代理请求头
   */
  static buildProxyHeaders(request: ProxyRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'user-agent': request.userAgent || VERSION_INFO.userAgent,
    };

    if (request.headers) {
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers[key.toLowerCase()] = value;
        }
      });
    }

    const cookieHeader = request.cookies ? CookieParser.toCookieHeader(request.cookies) : null;
    if (cookieHeader) {
      headers['cookie'] = cookieHeader;
    }

    if (request.referer) {
      headers['referer'] = request.referer;
    }

    return headers;
  }

  /**
   * 构造微博专用请求头
   */
  static buildWeiboHeaders(request: WeiboProxyRequest): Record<string, string> {
    const cookieHeader = request.cookies ? CookieParser.toCookieHeader(request.cookies) : null;
    const xsrfToken = request.xsrfToken || (request.cookies ? CookieParser.extractXsrfToken(request.cookies) : null);
    const referer = request.referer || 'https://weibo.com';

    if (!cookieHeader) {
      throw new Error('Cookie is required for Weibo API requests');
    }

    return {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'client-version': VERSION_INFO.clientVersion,
      'priority': 'u=1, i',
      'referer': referer,
      'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'server-version': VERSION_INFO.serverVersion,
      'user-agent': request.userAgent || VERSION_INFO.userAgent,
      'x-requested-with': 'XMLHttpRequest',
      ...(xsrfToken && { 'x-xsrf-token': xsrfToken }),
      'cookie': cookieHeader,
    };
  }
}
