# @sker/api

后端 API 服务

注意后端服务使用的是 better auth 插件

BASE_URL 是 /api/auth

## API 开发规范 - SDK 驱动开发

本项目采用 **SDK 驱动开发**模式，前后端共享类型定义，确保类型安全。

### 开发流程（三步走）

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  第一步: SDK    │ ──▶ │  第二步: API    │ ──▶ │  第三步: 调用   │
│  定义接口规范   │     │  实现接口       │     │  前端/后端调用  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### 第一步：在 @sker/sdk 定义接口规范

```typescript
// packages/sdk/src/controllers/keywords.controller.ts
import { Controller, Get, Query } from '@sker/core'
import type { KeywordWordCloudItem } from '../types'

@Controller('keywords')
export class KeywordsController {
  @Get('wordcloud')
  getWordCloud(@Query('maxWords', z.number()) maxWords?: number): Promise<KeywordWordCloudItem[]> {
    throw new Error('method getWordCloud not implements')
  }
}
```


#### 第二步：在 @sker/api 实现接口

```typescript
// apps/api/src/controllers/keywords.controller.ts
import { Controller, Get, Query } from '@sker/core'
import { root } from '@sker/core'
import { KeywordsService } from '../services/data/keywords.service'
import * as sdk from '@sker/sdk'

// ⚠️ 必须使用 sdk.KeywordsController 作为路径，否则会 404！
@Controller(sdk.KeywordsController)
export class KeywordsController implements sdk.KeywordsController {
  constructor(@Inject(KeywordsService) private keywordsService: KeywordsService) {
  }
  async getWordCloud(maxWords?: number) {
    return this.keywordsService.getWordCloud(maxWords || 100)
  }
}
```

#### 第三步：调用接口

```typescript
// 前端或其他服务调用
import { KeywordsController } from '@sker/sdk'
import { root } from '@sker/core'

// 获取词云数据
const keywordsCtrl = root.get(KeywordsController)
const wordCloud = await keywordsCtrl.getWordCloud(100)
// wordCloud 自动推断为 KeywordWordCloudItem[] 类型
```

### 重要规则

1. **SDK 是唯一的类型来源** - 前后端都从 @sker/sdk 导入类型
2. **不要做多余的类型转换** - SDK 的目的就是让前后端共用类型
3. **API 必须使用 `sdk.controller`** - 否则路由不匹配会导致 404
4. **使用 `root.get()` 获取实例** - 不要直接 new Controller


## 常用命令

```bash
# 启动开发服务器
turbo dev --filter=@sker/api

# 构建
turbo build --filter=@sker/api
```
