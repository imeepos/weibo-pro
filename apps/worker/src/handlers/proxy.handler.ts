import type { ProxyRequest, WeiboProxyRequest, ProxyResponse, ProxyError, Env } from '../types';
import { HeaderBuilder } from '../utils/header-builder';
import { Logger } from '../utils/logger';

/** 代理处理器配置，用于区分通用代理与微博代理 */
interface ProxyHandlerOptions {
  logPrefix: string;
  errorPrefix: string;
  /** 500 错误响应的 message 文案 */
  internalErrorMessage: string;
  /** 根据请求构造转发请求头 */
  buildHeaders: (request: any) => Record<string, string>;
  /** JSON body 时是否强制写入 content-type */
  contentTypeOnJsonBody?: boolean;
}

function errorResponse(errorPrefix: string, status: number, message: string, details?: unknown): Response {
  const error: ProxyError = {
    error: `${errorPrefix}:${status}`,
    message,
    details,
  };

  return new Response(JSON.stringify(error), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleProxyRequest(options: ProxyHandlerOptions, request: Request, env?: Env): Promise<Response> {
  const logger = new Logger(env?.LOGS_STREAM, options.logPrefix);
  const startTime = Date.now();

  try {
    const proxyRequest = await request.json() as ProxyRequest & WeiboProxyRequest;

    if (!proxyRequest.url) {
      logger.warn('Missing URL in proxy request');
      return errorResponse(options.errorPrefix, 400, 'URL is required');
    }

    logger.logProxyRequest(proxyRequest.url, proxyRequest.method || 'GET');

    const headers = options.buildHeaders(proxyRequest);

    const fetchOptions: RequestInit = {
      method: proxyRequest.method || 'GET',
      headers,
    };

    if (proxyRequest.body && ['POST', 'PUT', 'PATCH'].includes(proxyRequest.method || 'GET')) {
      if (typeof proxyRequest.body === 'string') {
        fetchOptions.body = proxyRequest.body;
      } else {
        fetchOptions.body = JSON.stringify(proxyRequest.body);
        if (options.contentTypeOnJsonBody) {
          headers['content-type'] = 'application/json';
        }
      }
    }

    const response = await fetch(proxyRequest.url, fetchOptions);
    const responseBody = await response.text();

    logger.info('proxy.success', {
      url: proxyRequest.url,
      status: response.status,
      duration_ms: Date.now() - startTime,
    });

    const proxyResponse: ProxyResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    };

    return new Response(JSON.stringify(proxyResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.logError(error, {
      duration_ms: Date.now() - startTime,
    });
    return errorResponse(options.errorPrefix, 500, options.internalErrorMessage, error);
  }
}

/**
 * 通用代理处理器
 */
export class ProxyHandler {
  static async handle(request: Request, env?: Env): Promise<Response> {
    return handleProxyRequest({
      logPrefix: 'proxy-handler',
      errorPrefix: 'ProxyError',
      internalErrorMessage: 'Internal proxy error',
      buildHeaders: HeaderBuilder.buildProxyHeaders,
      contentTypeOnJsonBody: true,
    }, request, env);
  }
}
