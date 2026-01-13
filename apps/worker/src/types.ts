/**
 * Cookie 输入格式
 * 支持 JSON 数组或 Cookie 字符串
 */
export type CookieInput = string | Array<{
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expirationDate?: number;
}>;

/**
 * 通用代理请求
 */
export interface ProxyRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object;
  cookies?: CookieInput;
  userAgent?: string;
  referer?: string;
}

/**
 * 微博专用代理请求
 */
export interface WeiboProxyRequest extends ProxyRequest {
  xsrfToken?: string;
}

/**
 * 代理响应
 */
export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * 错误响应
 */
export interface ProxyError {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * 环境变量
 */
export interface Env {
  // Cloudflare Workers 环境变量
  // 如需 D1 数据库或其他绑定，在此定义
}
