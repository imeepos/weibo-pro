import { root } from '@sker/core'
import { createProxyProviders, useProxy } from '@sker/ip-proxy'

// 1. 配置并初始化代理池
root.set(
  createProxyProviders({
    kuaidaili: {
      secretId: process.env.KUAIDAILI_SECRET_ID!,
      secretKey: process.env.KUAIDAILI_SECRET_KEY!,
      username: process.env.KUAIDAILI_USERNAME!,
      password: process.env.KUAIDAILI_PASSWORD!,
    },
    validator: {
      testUrl: 'https://httpbin.org/ip',
      timeout: 5000,
    },
  })
)

await root.init()

// 2. 使用代理池
const proxy = useProxy()

// 启动健康检查（每60秒检查一次）
proxy.startHealthCheck(60000)

// 3. 获取代理并使用
const proxyInfo = await proxy.getProxy()
console.log('代理URL:', proxyInfo.url)
console.log('过期时间:', new Date(proxyInfo.expiresAt))
console.log('质量评分:', proxyInfo.score)

// 4. 使用代理发送请求
const startTime = Date.now()
try {
  const axiosWithProxy = proxy.createAxios({
    baseURL: 'https://api.weibo.com',
    timeout: 10000,
  })

  const response = await axiosWithProxy.get('/v2/search/topics')
  const latency = Date.now() - startTime

  // 记录成功结果
  await proxy.recordResult(proxyInfo.url, true, latency)
  console.log('请求成功，延迟:', latency, 'ms')
} catch (error) {
  const latency = Date.now() - startTime

  // 记录失败结果
  await proxy.recordResult(proxyInfo.url, false, latency)
  console.error('请求失败:', error)
}

// 5. 释放代理
await proxy.releaseProxy(proxyInfo.url)

// 6. 查看代理评分
const score = await proxy.getScore(proxyInfo.url)
console.log('代理评分:', score)

// 7. 程序退出时停止健康检查
process.on('SIGINT', () => {
  proxy.stopHealthCheck()
  process.exit(0)
})
