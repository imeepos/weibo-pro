/**
 * 代理URL解析器测试
 */

import { describe, it, expect } from 'vitest'
import { parseProxyUrl } from '../../utils/proxy-url-parser'
import { ProxyConfigError } from '../../errors/proxy-errors'

describe('Proxy URL Parser', () => {
  describe('parseProxyUrl', () => {
    it('should parse HTTP proxy without auth', () => {
      const result = parseProxyUrl('http://192.168.1.1:8080')

      expect(result).toEqual({
        protocol: 'http',
        host: '192.168.1.1',
        port: 8080,
        auth: undefined,
      })
    })

    it('should parse HTTPS proxy without auth', () => {
      const result = parseProxyUrl('https://192.168.1.1:8443')

      expect(result).toEqual({
        protocol: 'https',
        host: '192.168.1.1',
        port: 8443,
        auth: undefined,
      })
    })

    it('should parse SOCKS5 proxy', () => {
      const result = parseProxyUrl('socks5://192.168.1.1:1080')

      expect(result).toEqual({
        protocol: 'socks5',
        host: '192.168.1.1',
        port: 1080,
        auth: undefined,
      })
    })

    it('should parse proxy with auth', () => {
      const result = parseProxyUrl('http://username:password@192.168.1.1:8080')

      expect(result).toEqual({
        protocol: 'http',
        host: '192.168.1.1',
        port: 8080,
        auth: {
          username: 'username',
          password: 'password',
        },
      })
    })

    it('should parse proxy with encoded auth', () => {
      const result = parseProxyUrl(
        'http://user%40name:pass%40word@192.168.1.1:8080'
      )

      expect(result).toEqual({
        protocol: 'http',
        host: '192.168.1.1',
        port: 8080,
        auth: {
          username: 'user@name',
          password: 'pass@word',
        },
      })
    })

    it('should use default port for HTTP when not specified', () => {
      const result = parseProxyUrl('http://192.168.1.1')

      expect(result.port).toBe(80)
    })

    it('should use default port for HTTPS when not specified', () => {
      const result = parseProxyUrl('https://192.168.1.1')

      expect(result.port).toBe(443)
    })

    it('should use default port for SOCKS5 when not specified', () => {
      const result = parseProxyUrl('socks5://192.168.1.1')

      expect(result.port).toBe(1080)
    })

    it('should parse domain name', () => {
      const result = parseProxyUrl('http://proxy.example.com:8080')

      expect(result).toEqual({
        protocol: 'http',
        host: 'proxy.example.com',
        port: 8080,
        auth: undefined,
      })
    })

    it('should parse IPv6 address', () => {
      const result = parseProxyUrl('http://[2001:db8::1]:8080')

      expect(result).toEqual({
        protocol: 'http',
        host: '[2001:db8::1]', // URL.hostname includes brackets for IPv6
        port: 8080,
        auth: undefined,
      })
    })

    it('should throw error for invalid URL', () => {
      expect(() => parseProxyUrl('not-a-url')).toThrow(ProxyConfigError)
      expect(() => parseProxyUrl('not-a-url')).toThrow('无法解析代理URL')
    })

    it('should throw error for empty string', () => {
      expect(() => parseProxyUrl('')).toThrow(ProxyConfigError)
    })

    it('should handle special characters in password', () => {
      const result = parseProxyUrl(
        'http://user:p%40ss%23w0rd%21@192.168.1.1:8080'
      )

      expect(result.auth).toEqual({
        username: 'user',
        password: 'p@ss#w0rd!',
      })
    })

    it('should handle empty password', () => {
      const result = parseProxyUrl('http://user:@192.168.1.1:8080')

      expect(result.auth).toEqual({
        username: 'user',
        password: '',
      })
    })

    it('should handle port as string that can be parsed', () => {
      const result = parseProxyUrl('http://192.168.1.1:8080')

      expect(result.port).toBe(8080)
      expect(typeof result.port).toBe('number')
    })
  })
})
