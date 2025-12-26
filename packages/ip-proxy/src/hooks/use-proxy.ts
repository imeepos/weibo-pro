import { root } from '@sker/core'
import type { ProxyManager, ProxyOptions } from '../types'
import { ProxyPool } from '../core/proxy-pool'
import { ProxyHealthChecker } from '../core/proxy-health-checker'
import { ProxyScorer } from '../core/proxy-scorer'
import { ProxyInterceptor } from '../interceptors/axios-interceptor'
import { ProxyBrowserLauncher } from '../interceptors/browser-launcher'

/**
 * 代理池Hook - 简化API
 *
 * 参考@sker/mq的useQueue模式，提供全局单例访问
 *
 * @param options 代理选项（可选）
 * @returns ProxyManager实例
 */
export function useProxy(options?: ProxyOptions): ProxyManager {
  // 从DI容器获取实例
  const proxyPool = root.get(ProxyPool)
  const healthChecker = root.get(ProxyHealthChecker)
  const scorer = root.get(ProxyScorer)
  const interceptor = root.get(ProxyInterceptor)
  const browserLauncher = root.get(ProxyBrowserLauncher)

  return {
    /**
     * 获取可用代理
     */
    async getProxy() {
      return proxyPool.getProxy()
    },

    /**
     * 批量获取代理
     */
    async getProxies(count: number) {
      return proxyPool.getProxies(count)
    },

    /**
     * 释放代理（减少使用计数）
     */
    async releaseProxy(url: string) {
      return proxyPool.releaseProxy(url)
    },

    /**
     * 刷新过期代理
     */
    async refreshExpired() {
      return proxyPool.refreshExpiredProxies()
    },

    /**
     * 启动健康检查
     */
    startHealthCheck(intervalMs?: number) {
      healthChecker.start(intervalMs)
    },

    /**
     * 停止健康检查
     */
    stopHealthCheck() {
      healthChecker.stop()
    },

    /**
     * 记录代理使用结果（用于评分）
     */
    async recordResult(proxyUrl: string, success: boolean, latency: number) {
      return scorer.recordResult(proxyUrl, success, latency)
    },

    /**
     * 获取代理评分
     */
    async getScore(proxyUrl: string) {
      return scorer.getScore(proxyUrl)
    },

    /**
     * 创建带自动代理注入的Axios实例
     */
    createAxios(config?) {
      return interceptor.createAxiosInstance(config)
    },

    /**
     * 启动带代理的Playwright浏览器
     */
    async launchBrowser(type, browserOptions?) {
      return browserLauncher.launch(type, browserOptions)
    },
  }
}
