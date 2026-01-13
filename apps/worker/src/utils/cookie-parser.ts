import type { CookieInput } from '../types';

/**
 * Cookie 解析器
 * 统一处理 JSON 数组和 Cookie 字符串格式
 */
export class CookieParser {
  /**
   * 将 CookieInput 转换为 Cookie 头部字符串
   */
  static toCookieHeader(cookies: CookieInput): string | null {
    if (!cookies) {
      return null;
    }

    // 字符串格式：直接返回
    if (typeof cookies === 'string') {
      const trimmed = cookies.trim();
      return trimmed.includes('=') ? trimmed : null;
    }

    // JSON 数组格式：转换为 "name=value; name2=value2"
    if (Array.isArray(cookies)) {
      const fragments = cookies
        .map(entry => {
          if (!entry) return '';
          const name = typeof entry.name === 'string' ? entry.name.trim() : '';
          const value = typeof entry.value === 'string' ? entry.value.trim() : '';
          if (!name || !value) return '';
          return `${name}=${value}`;
        })
        .filter(fragment => fragment.length > 0);

      return fragments.length > 0 ? fragments.join('; ') : null;
    }

    return null;
  }

  /**
   * 从 Cookie 中提取 XSRF-TOKEN
   */
  static extractXsrfToken(cookies: CookieInput): string | null {
    const cookieHeader = this.toCookieHeader(cookies);
    if (!cookieHeader) {
      return null;
    }

    const cookieList = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookieList) {
      const [name, value] = cookie.split('=').map(s => s.trim());
      if (name === 'XSRF-TOKEN' && value) {
        return value;
      }
    }

    return null;
  }
}
