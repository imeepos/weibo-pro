import type { ParsedProxyConfig } from '../types'
import { ProxyConfigError } from '../errors/proxy-errors'

/**
 * 解析代理URL
 * @param proxyUrl 代理URL，格式：protocol://[user:pass@]host:port
 * @returns 解析后的代理配置
 */
export function parseProxyUrl(proxyUrl: string): ParsedProxyConfig {
  try {
    const url = new URL(proxyUrl)

    return {
      protocol: url.protocol.replace(':', '') as 'http' | 'https' | 'socks5',
      host: url.hostname,
      port: parseInt(url.port, 10) || getDefaultPort(url.protocol),
      auth: url.username
        ? {
            username: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
          }
        : undefined,
    }
  } catch (error) {
    throw new ProxyConfigError(
      `无法解析代理URL: ${proxyUrl}`,
      { originalError: error }
    )
  }
}

/**
 * 获取协议的默认端口
 */
function getDefaultPort(protocol: string): number {
  switch (protocol.replace(':', '')) {
    case 'http':
      return 80
    case 'https':
      return 443
    case 'socks5':
      return 1080
    default:
      return 80
  }
}
