# Crawler SDK 使用示例

这些 SDK 控制器已经添加到 @sker/sdk 包中，对应 @sker/api 中的爬虫控制器。

## 新增的 SDK 控制器

### 1. ConfigController (config.controller.ts)
管理各平台的爬虫配置

```typescript
import { root } from '@sker/core'
import { providers, ConfigController } from '@sker/sdk'

// 配置 SDK
root.set([...providers({ baseURL: 'http://localhost:3000/api' })])

// 获取控制器实例
const configCtrl = root.get(ConfigController)

// 获取小红书平台配置
const xhsConfig = await configCtrl.getConfig('xhs')

// 更新抖音平台配置
await configCtrl.updateConfig('dy', {
  enableComments: true,
  maxRetries: 3
})
```

### 2. CrawlerController (crawler.controller.ts)
管理爬虫任务的生命周期

```typescript
import { CrawlerController, CrawlerStartRequest } from '@sker/sdk'

const crawlerCtrl = root.get(CrawlerController)

// 启动爬虫任务
const startRequest: CrawlerStartRequest = {
  platform: 'xhs',
  loginType: 'qrcode',
  crawlerType: 'search',
  keywords: 'AI人工智能',
  startPage: 1,
  enableComments: true,
  saveOption: 'json'
}

const result = await crawlerCtrl.start(startRequest)
console.log('任务ID:', result.id)

// 查询任务状态
const status = await crawlerCtrl.getStatus(result.id)
console.log('任务状态:', status.status)

// 停止任务
await crawlerCtrl.stop(result.id)

// 获取所有任务列表
const { crawlers } = await crawlerCtrl.list()
console.log('任务列表:', crawlers)
```

### 3. LoginController (login.controller.ts)
管理平台登录流程

```typescript
import { LoginController } from '@sker/sdk'

const loginCtrl = root.get(LoginController)

// 获取二维码登录
const qrcode = await loginCtrl.getQRCode('wb')
console.log('二维码URL:', qrcode.qrUrl)

// 轮询登录状态
const loginStatus = await loginCtrl.getStatus('wb')
if (loginStatus.status === 'success') {
  console.log('登录成功!', loginStatus.data)
}

// Cookie 登录
await loginCtrl.loginWithCookie('xhs', {
  platform: 'xhs',
  cookies: 'your-cookie-string-here'
})
```

## API 路由映射

| SDK 控制器 | API 路由前缀 | 后端实现 |
|-----------|------------|---------|
| ConfigController | `/config` | apps/api/src/crawler/config.controller.ts |
| CrawlerController | `/crawler` | apps/api/src/crawler/crawler.controller.ts |
| LoginController | `/login` | apps/api/src/crawler/login.controller.ts |

## 完整使用示例

```typescript
import { root } from '@sker/core'
import {
  providers,
  ConfigController,
  CrawlerController,
  LoginController,
  type CrawlerStartRequest
} from '@sker/sdk'

async function main() {
  // 1. 配置 SDK 客户端
  root.set([
    ...providers({
      baseURL: 'http://localhost:3000/api',
      headers: {
        'Authorization': 'Bearer your-token'
      }
    })
  ])

  // 2. 获取控制器实例
  const configCtrl = root.get(ConfigController)
  const crawlerCtrl = root.get(CrawlerController)
  const loginCtrl = root.get(LoginController)

  // 3. 配置平台
  const config = await configCtrl.getConfig('xhs')
  console.log('小红书配置:', config)

  // 4. 登录（如果需要）
  const qrcode = await loginCtrl.getQRCode('xhs')
  console.log('请扫描二维码登录:', qrcode.qrUrl)

  // 等待登录完成
  let loginStatus
  do {
    await new Promise(resolve => setTimeout(resolve, 2000))
    loginStatus = await loginCtrl.getStatus('xhs')
  } while (loginStatus.status === 'pending')

  if (loginStatus.status === 'success') {
    console.log('登录成功!')

    // 5. 启动爬虫
    const request: CrawlerStartRequest = {
      platform: 'xhs',
      crawlerType: 'search',
      keywords: 'AI技术',
      startPage: 1,
      enableComments: true,
      saveOption: 'json'
    }

    const result = await crawlerCtrl.start(request)
    console.log('爬虫任务已启动, ID:', result.id)

    // 6. 监控任务状态
    let status
    do {
      await new Promise(resolve => setTimeout(resolve, 5000))
      status = await crawlerCtrl.getStatus(result.id)
      console.log('任务状态:', status.status)
    } while (status.status === 'running')

    console.log('爬虫任务完成!')
  }
}

main().catch(console.error)
```

## 类型定义

所有类型都已在 @sker/sdk 中定义：

- `MediaPlatform`: 平台枚举 ('xhs' | 'dy' | 'ks' | 'bili' | 'wb' | 'tieba' | 'zhihu')
- `CrawlerStartRequest`: 爬虫启动请求
- `CrawlerStatusDetail`: 爬虫状态响应
- `CrawlerListItem`: 爬虫列表项
- `QRCodeData`: 二维码数据
- `LoginStatusResponse`: 登录状态响应
- `CookieLoginRequest`: Cookie 登录请求

## 注意事项

1. **装饰器驱动**: 这些控制器使用装饰器元数据自动生成 HTTP 请求，无需手写请求逻辑
2. **类型安全**: 所有 API 调用都有完整的 TypeScript 类型支持
3. **DI 集成**: 通过 @sker/core 的依赖注入容器管理实例
4. **Better Auth**: 使用 better-fetch 提供现代化的认证支持
