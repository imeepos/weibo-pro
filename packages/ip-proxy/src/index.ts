import { Provider, InjectionToken } from '@sker/core'
import { Logger } from '@sker/core'
import type { KuaidailiConfig, ValidatorConfig } from './types'
import { ProxyCache } from './core/proxy-cache'
import { ProxyValidator, PROXY_VALIDATOR_CONFIG } from './core/proxy-validator'
import { ProxyPool } from './core/proxy-pool'
import { ProxyHealthChecker } from './core/proxy-health-checker'
import { ProxyScorer } from './core/proxy-scorer'
import { BaseProxyProvider } from './providers/base-provider'
import { KuaidailiProvider, KUAIDAILI_CONFIG } from './providers/kuaidaili-provider'
import { ProxyInterceptor } from './interceptors/axios-interceptor'
import { ProxyBrowserLauncher } from './interceptors/browser-launcher'

// 核心层
export { ProxyCache }
export { ProxyValidator, PROXY_VALIDATOR_CONFIG }
export { ProxyPool }
export { ProxyHealthChecker }
export { ProxyScorer }

// 提供商层
export { BaseProxyProvider }
export { KuaidailiProvider, KUAIDAILI_CONFIG }

// 拦截器层
export { ProxyInterceptor }
export { ProxyBrowserLauncher }

// Hook API
export { useProxy } from './hooks/use-proxy'

// 类型导出
export * from './types'

// 错误类导出
export * from './errors/proxy-errors'

// 常量导出
export { CacheKeys, getMetadataKey } from './constants/cache-keys'

// 工具函数导出
export * from './utils/time'
export { parseProxyUrl } from './utils/proxy-url-parser'

/**
 * 代理提供商配置接口
 */
export interface ProxyProvidersConfig {
  /** 快代理配置 */
  kuaidaili: KuaidailiConfig

  /** 验证器配置（可选） */
  validator?: Partial<ValidatorConfig>
}

/**
 * 创建代理提供商Providers
 *
 * 用于注册到@sker/core DI容器
 *
 * @param config 配置对象
 * @returns Provider数组
 *
 * @example
 * ```typescript
 * import { root } from '@sker/core'
 * import { createProxyProviders } from '@sker/ip-proxy'
 *
 * root.set(createProxyProviders({
 *   kuaidaili: {
 *     secretId: process.env.KUAIDAILI_SECRET_ID!,
 *     secretKey: process.env.KUAIDAILI_SECRET_KEY!,
 *     username: process.env.KUAIDAILI_USERNAME!,
 *     password: process.env.KUAIDAILI_PASSWORD!,
 *   },
 *   validator: {
 *     testUrl: 'https://httpbin.org/ip',
 *     timeout: 5000,
 *   },
 * }))
 *
 * await root.init()
 * ```
 */
export function createProxyProviders(
  config: ProxyProvidersConfig
): Provider[] {
  return [
    // 注入配置令牌
    { provide: KUAIDAILI_CONFIG, useValue: config.kuaidaili },
    {
      provide: PROXY_VALIDATOR_CONFIG,
      useValue: config.validator || {},
    },

    // 注册核心服务
    { provide: ProxyCache, useClass: ProxyCache },
    { provide: ProxyValidator, useClass: ProxyValidator },
    { provide: ProxyPool, useClass: ProxyPool },
    { provide: ProxyHealthChecker, useClass: ProxyHealthChecker },
    { provide: ProxyScorer, useClass: ProxyScorer },

    // 注册提供商
    {
      provide: BaseProxyProvider,
      useExisting: KuaidailiProvider,
    },
    { provide: KuaidailiProvider, useClass: KuaidailiProvider },

    // 注册拦截器
    { provide: ProxyInterceptor, useClass: ProxyInterceptor },
    { provide: ProxyBrowserLauncher, useClass: ProxyBrowserLauncher },

    // 注册Logger（如果尚未注册）
    { provide: Logger, useClass: Logger },
  ]
}
