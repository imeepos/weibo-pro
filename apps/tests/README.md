# @sker/tests

API 集成测试包

## 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# UI 模式
pnpm test:ui
```

## 环境变量

创建 `.env` 文件：

```bash
API_BASE_URL=http://localhost:8089
```

## 添加新测试

在 `src/` 目录下创建 `*.test.ts` 文件：

```typescript
import { describe, it, expect } from 'vitest'
import { root } from '@sker/core'
import { YourController } from '@sker/sdk'

describe('Your API', () => {
  it('should work', async () => {
    const ctrl = root.get(YourController)
    const result = await ctrl.someMethod()
    expect(result).toBeDefined()
  })
})
```
