/**
 * 代理相关的基础错误类
 */
export class ProxyError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'PROXY_ERROR',
    public readonly statusCode: number = 500,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ProxyError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 代理获取失败错误
 */
export class ProxyFetchError extends ProxyError {
  constructor(
    message: string,
    public readonly provider: string,
    meta?: Record<string, unknown>
  ) {
    super(message, 'PROXY_FETCH_ERROR', 500, { provider, ...meta })
    this.name = 'ProxyFetchError'
  }
}

/**
 * 代理验证失败错误
 */
export class ProxyValidationError extends ProxyError {
  constructor(
    message: string,
    public readonly proxyUrl: string,
    meta?: Record<string, unknown>
  ) {
    super(message, 'PROXY_VALIDATION_ERROR', 500, { proxyUrl, ...meta })
    this.name = 'ProxyValidationError'
  }
}

/**
 * 代理池耗尽错误
 */
export class ProxyPoolExhaustedError extends ProxyError {
  constructor(message: string = '代理池已耗尽，无可用代理') {
    super(message, 'PROXY_POOL_EXHAUSTED', 503, { exhausted: true })
    this.name = 'ProxyPoolExhaustedError'
  }
}

/**
 * 代理配置错误
 */
export class ProxyConfigError extends ProxyError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'PROXY_CONFIG_ERROR', 400, meta)
    this.name = 'ProxyConfigError'
  }
}
