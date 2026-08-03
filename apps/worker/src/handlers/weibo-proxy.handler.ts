import type { Env } from '../types';
import { HeaderBuilder } from '../utils/header-builder';
import { handleProxyRequest } from './proxy.handler';

/**
 * 微博专用代理处理器
 * 与通用 ProxyHandler 共用同一实现，仅替换请求头构建与错误文案。
 */
export class WeiboProxyHandler {
  static async handle(request: Request, env?: Env): Promise<Response> {
    return handleProxyRequest({
      logPrefix: 'weibo-proxy-handler',
      errorPrefix: 'WeiboProxyError',
      internalErrorMessage: 'Weibo proxy error',
      buildHeaders: HeaderBuilder.buildWeiboHeaders,
    }, request, env);
  }
}
