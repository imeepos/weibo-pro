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
 * Streams 发送器
 */
export interface StreamSender {
  send(events: Array<{ value: Record<string, unknown> }>): Promise<void>;
}

/**
 * 浏览器渲染请求
 */
export interface BrowserRenderRequest {
  url: string;
  cookies?: string;
  userAgent?: string;
  timeout?: number;
  waitForSelector?: string;
}

/**
 * 浏览器渲染响应
 */
export interface BrowserRenderResponse {
  html: string;
  title?: string;
  url?: string;
}

/**
 * 浏览器渲染错误
 */
export interface BrowserRenderError {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * 环境变量
 */
export interface Env {
  /** Cloudflare Workers 环境变量 */

  /** Streams 日志管道绑定 */
  LOGS_STREAM?: StreamSender;

  /** Browser Rendering API 绑定 */
  BROWSER?: any;
}
