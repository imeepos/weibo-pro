import type { ProxyProvider, RawProxyData } from '../types'

/**
 * 代理提供商抽象基类
 */
export abstract class BaseProxyProvider implements ProxyProvider {
  abstract readonly name: string

  abstract fetchProxy(): Promise<RawProxyData>

  /**
   * 批量获取代理（默认实现：并发调用fetchProxy）
   */
  async fetchProxies(count: number): Promise<RawProxyData[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.fetchProxy())
    )
  }

  /**
   * 构建代理URL
   */
  protected buildProxyUrl(data: RawProxyData): string {
    const auth =
      data.username && data.password
        ? `${data.username}:${data.password}@`
        : ''
    return `${data.protocol}://${auth}${data.ip}:${data.port}`
  }
}
