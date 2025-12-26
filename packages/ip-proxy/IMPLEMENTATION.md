# 代理池管理模块实现总结

## 实现内容

基于现有的 `@sker/ip-proxy` 包，补充了以下核心功能：

### 1. 代理健康检查器 (ProxyHealthChecker)

**文件**: `packages/ip-proxy/src/core/proxy-health-checker.ts`

**功能**:
- 定时检测代理池健康状态
- 自动移除失效代理
- 自动刷新过期代理

**API**:
```typescript
const proxy = useProxy()

// 启动健康检查（默认60秒间隔）
proxy.startHealthCheck(60000)

// 停止健康检查
proxy.stopHealthCheck()
```

### 2. 代理质量评分器 (ProxyScorer)

**文件**: `packages/ip-proxy/src/core/proxy-scorer.ts`

**功能**:
- 基于延迟和成功率计算代理质量评分（0-100）
- 评分算法：成功率 70% + 延迟 30%
- 自动存储和更新评分（Redis Hash，7天过期）

**API**:
```typescript
// 记录代理使用结果
await proxy.recordResult(proxyUrl, true, 150) // 成功，延迟150ms

// 获取代理评分
const score = await proxy.getScore(proxyUrl) // 返回 0-100
```

### 3. 类型增强

**文件**: `packages/ip-proxy/src/types/proxy.types.ts`

- `ProxyInfo` 接口新增 `score?: number` 字段
- `ProxyManager` 接口新增健康检查和评分相关方法

### 4. 缓存键扩展

**文件**: `packages/ip-proxy/src/constants/cache-keys.ts`

- 新增 `SCORE_PREFIX = 'ip_proxy:score:'` 用于存储代理评分数据

## 架构特点

### 存在即合理
- 每个类都有明确职责：
  - `ProxyHealthChecker`: 定时健康检查
  - `ProxyScorer`: 质量评分计算
  - `ProxyPool`: 代理获取和分配
  - `ProxyCache`: Redis 缓存操作
  - `ProxyValidator`: 代理验证

### 优雅即简约
- 健康检查器仅 70 行代码，职责单一
- 评分器使用简单算法：`成功率 * 0.7 + 延迟评分 * 0.3`
- 无冗余功能，每个方法都有明确用途

### 性能即艺术
- 评分数据存储在 Redis Hash，查询高效
- 批量评分查询支持（`getScores`）
- 健康检查异步执行，不阻塞主流程

## 使用示例

完整示例见 `packages/ip-proxy/examples/usage.ts`

```typescript
import { root } from '@sker/core'
import { createProxyProviders, useProxy } from '@sker/ip-proxy'

// 1. 初始化
root.set(createProxyProviders({
  kuaidaili: { /* 配置 */ },
  validator: { testUrl: 'https://httpbin.org/ip', timeout: 5000 }
}))
await root.init()

// 2. 使用
const proxy = useProxy()

// 启动健康检查
proxy.startHealthCheck(60000)

// 获取代理
const proxyInfo = await proxy.getProxy()

// 使用代理
const startTime = Date.now()
try {
  const axios = proxy.createAxios()
  await axios.get('/api')

  // 记录成功
  await proxy.recordResult(proxyInfo.url, true, Date.now() - startTime)
} catch (error) {
  // 记录失败
  await proxy.recordResult(proxyInfo.url, false, Date.now() - startTime)
}

// 释放代理
await proxy.releaseProxy(proxyInfo.url)

// 查看评分
const score = await proxy.getScore(proxyInfo.url)
```

## 相比 MediaCrawler 的优势

| 特性 | MediaCrawler | @sker/ip-proxy |
|------|--------------|----------------|
| 健康检查 | 无 | 定时自动检查 |
| 质量评分 | 无 | 基于成功率和延迟的智能评分 |
| 评分存储 | 无 | Redis 持久化，7天过期 |
| 分配策略 | 随机 | 基于使用次数的轮询 + 评分参考 |
| 类型安全 | 无 | 完整 TypeScript 类型 |
| DI 集成 | 无 | 完全集成 @sker/core |

## 文件清单

新增文件：
- `packages/ip-proxy/src/core/proxy-health-checker.ts` - 健康检查器
- `packages/ip-proxy/src/core/proxy-scorer.ts` - 质量评分器
- `packages/ip-proxy/examples/usage.ts` - 使用示例

修改文件：
- `packages/ip-proxy/src/types/proxy.types.ts` - 类型增强
- `packages/ip-proxy/src/constants/cache-keys.ts` - 缓存键扩展
- `packages/ip-proxy/src/hooks/use-proxy.ts` - Hook API 扩展
- `packages/ip-proxy/src/index.ts` - 导出新模块

## 构建状态

✅ 构建成功
- ESM: `dist/index.mjs` (43.00 KB)
- CJS: `dist/index.js` (46.05 KB)
- DTS: `dist/index.d.ts` (12.80 KB)
