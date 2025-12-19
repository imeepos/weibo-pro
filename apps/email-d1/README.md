# Email D1 Service

基于 Cloudflare D1 的临时邮箱服务，接收邮件并提供 API 查询。

## 架构设计

```
邮件发送 → Cloudflare Email Routing → Worker (email handler)
                                          ↓
                                       保存到 D1
                                          ↓
                           HTTP API ← 查询邮件
```

### 核心功能

**存在即合理** - 只实现必要功能：
- ✅ 接收邮件并保存到 D1 数据库
- ✅ 查询指定邮箱地址的最新邮件
- ✅ 查询指定邮箱地址的多封邮件（支持 limit）

**优雅即简约** - 代码简洁自述：
- 简单的邮件解析（提取发件人、主题、正文）
- RESTful API 设计
- 完整的错误处理

## 快速开始

### 1. 安装依赖

```bash
cd apps/email-d1
pnpm install
```

### 2. 创建 D1 数据库

```bash
pnpm d1:create
```

执行后会输出 `database_id`，复制并填入 `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "email-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 填入这里
```

### 3. 初始化数据库表

**本地开发环境：**
```bash
pnpm d1:execute
```

**生产环境：**
```bash
pnpm d1:execute-remote
```

### 4. 本地开发

```bash
pnpm dev
```

Worker 会运行在 `http://localhost:8787`

### 5. 部署到 Cloudflare

```bash
pnpm deploy
```

部署后会获得一个 Worker URL，例如：
```
https://email-d1.<your-subdomain>.workers.dev
```

### 6. 配置 Email Routing

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择你的域名
3. 进入 **Email** → **Email Routing**
4. 点击 **Destination addresses** → **Add destination**
5. 添加一个目标地址（例如：`catch-all@yourdomain.com`）
6. 在 **Routing rules** 中添加规则：
   - **Match**: `All addresses`
   - **Action**: `Send to Worker`
   - **Worker**: 选择 `email-d1`

## API 使用

### 查询最新邮件

**端点**: `GET /api/latest`

**参数**:
- `address` (必需) - 邮箱地址

**示例**:
```bash
curl "https://email-d1.your-subdomain.workers.dev/api/latest?address=test@yourdomain.com"
```

**响应**:
```json
{
  "id": 1,
  "address": "test@yourdomain.com",
  "from_address": "sender@example.com",
  "subject": "Test Email",
  "content": "Email body content...",
  "raw": "Full RFC 822 email...",
  "message_id": "<unique-message-id@example.com>",
  "received_at": "2024-01-01 12:00:00",
  "created_at": "2024-01-01 12:00:00"
}
```

### 查询多封邮件

**端点**: `GET /api/emails`

**参数**:
- `address` (必需) - 邮箱地址
- `limit` (可选，默认 10) - 返回邮件数量

**示例**:
```bash
curl "https://email-d1.your-subdomain.workers.dev/api/emails?address=test@yourdomain.com&limit=5"
```

**响应**:
```json
[
  {
    "id": 3,
    "address": "test@yourdomain.com",
    "from_address": "sender3@example.com",
    "subject": "Third Email",
    "content": "...",
    "received_at": "2024-01-01 14:00:00"
  },
  {
    "id": 2,
    "address": "test@yourdomain.com",
    "from_address": "sender2@example.com",
    "subject": "Second Email",
    "content": "...",
    "received_at": "2024-01-01 13:00:00"
  }
]
```

## 数据库结构

### emails 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| address | TEXT | 收件地址 |
| from_address | TEXT | 发件地址 |
| subject | TEXT | 邮件主题 |
| content | TEXT | 邮件正文（纯文本） |
| raw | TEXT | 邮件原始内容（RFC 822） |
| message_id | TEXT | 邮件唯一标识 |
| received_at | DATETIME | 接收时间 |
| created_at | DATETIME | 创建时间 |

**索引**:
- `idx_emails_address` - 快速查询指定地址
- `idx_emails_received_at` - 快速查询最新邮件
- `idx_emails_address_received` - 复合索引，优化查询性能

## 实现细节

### 邮件处理流程

```typescript
// 1. 接收邮件
async email(message: ForwardableEmailMessage, env: Env) {
  // 2. 解析邮件内容
  const rawEmail = await new Response(message.raw).text();
  const parsed = await parseEmail(rawEmail);

  // 3. 保存到 D1
  await env.DB.prepare(
    `INSERT INTO emails (...) VALUES (...)`
  ).bind(...).run();
}
```

### 邮件解析

简单的基于行的解析器：
```typescript
async function parseEmail(rawEmail: string) {
  // 提取 From、Subject 和邮件正文
  // 支持标准 RFC 822 格式
}
```

### API 设计

**RESTful 风格**:
- `GET /api/latest` - 获取单封最新邮件
- `GET /api/emails` - 获取邮件列表

**CORS 支持**:
```typescript
headers: {
  'Access-Control-Allow-Origin': '*'
}
```

## 使用场景

### 1. 验证码接收

```javascript
// 发送验证码邮件后
async function getVerificationCode(email) {
  await sleep(3000); // 等待邮件到达

  const response = await fetch(
    `https://email-d1.workers.dev/api/latest?address=${email}`
  );

  const data = await response.json();

  // 从邮件内容中提取验证码
  const code = data.content.match(/\d{6}/)?.[0];
  return code;
}
```

### 2. 自动化测试

```javascript
describe('Email Registration', () => {
  it('should receive confirmation email', async () => {
    const testEmail = 'test@yourdomain.com';

    // 触发注册流程
    await registerUser(testEmail);

    // 等待并获取邮件
    await sleep(5000);
    const latest = await fetchLatestEmail(testEmail);

    // 验证邮件内容
    expect(latest.subject).toContain('Confirmation');
    expect(latest.content).toContain('Welcome');
  });
});
```

### 3. Webhook 集成

```javascript
// 监听邮件到达
app.post('/webhook', async (req, res) => {
  const { address } = req.body;

  const latest = await fetch(
    `https://email-d1.workers.dev/api/latest?address=${address}`
  );

  const email = await latest.json();

  // 处理邮件内容
  await processEmail(email);
});
```

## 扩展功能

如需更多功能，可以扩展实现：

### 1. 邮件搜索

```sql
SELECT * FROM emails
WHERE address = ?
  AND (subject LIKE ? OR content LIKE ?)
ORDER BY received_at DESC
```

### 2. 邮件删除

```typescript
app.delete('/api/emails/:id', async (req) => {
  await env.DB.prepare(
    'DELETE FROM emails WHERE id = ?'
  ).bind(req.params.id).run();
});
```

### 3. 邮件统计

```sql
SELECT
  address,
  COUNT(*) as total,
  MAX(received_at) as last_received
FROM emails
GROUP BY address
```

### 4. 定期清理

```typescript
// 在 wrangler.toml 中配置 Cron Trigger
[triggers]
crons = ["0 0 * * *"]  # 每天 0 点执行

// 清理 7 天前的邮件
async scheduled(event, env) {
  await env.DB.prepare(
    `DELETE FROM emails WHERE received_at < datetime('now', '-7 days')`
  ).run();
}
```

## 性能优化

### 1. 数据库索引

已创建复合索引优化常见查询：
```sql
CREATE INDEX idx_emails_address_received
ON emails(address, received_at DESC);
```

### 2. 查询限制

默认限制查询数量，防止大量数据传输：
```typescript
const limit = Math.min(parseInt(req.query.limit) || 10, 100);
```

### 3. 缓存策略

对于频繁访问的邮件，可以使用 KV 缓存：
```typescript
// 缓存最新邮件 60 秒
const cached = await env.KV.get(`latest:${address}`);
if (cached) return JSON.parse(cached);

const email = await queryDatabase();
await env.KV.put(`latest:${address}`, JSON.stringify(email), {
  expirationTtl: 60
});
```

## 安全考虑

### 1. 访问控制

添加 API 密钥验证：
```typescript
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== env.API_KEY) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. 速率限制

使用 Durable Objects 实现速率限制：
```typescript
const rateLimiter = env.RATE_LIMITER.get(id);
const allowed = await rateLimiter.checkRate();
```

### 3. 邮件大小限制

```typescript
if (message.rawSize > 10 * 1024 * 1024) { // 10MB
  message.setReject('Email too large');
  return;
}
```

## 故障排查

### 邮件未保存

1. 检查 D1 数据库绑定是否正确
2. 查看 Worker 日志：`wrangler tail`
3. 验证 Email Routing 规则配置

### 查询返回 404

1. 确认邮箱地址拼写正确
2. 检查邮件是否已到达（查看数据库）
3. 验证 Worker 已部署

### 数据库连接失败

```bash
# 查看 D1 数据库状态
wrangler d1 list

# 查询数据库内容
wrangler d1 execute email-db --command "SELECT * FROM emails LIMIT 10"
```

## 项目文件结构

```
apps/email-d1/
├── src/
│   └── index.ts           # Worker 入口（邮件处理 + API）
├── package.json           # 依赖配置
├── tsconfig.json          # TypeScript 配置
├── wrangler.toml          # Cloudflare Workers 配置
├── schema.sql             # D1 数据库表结构
└── README.md              # 本文档
```

## 成本估算

Cloudflare 免费额度：
- **Workers**: 100,000 请求/天
- **D1**: 5GB 存储 + 500万行读取/天
- **Email Routing**: 完全免费

对于个人或小型项目，完全在免费额度内。

## 参考资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Email Routing 文档](https://developers.cloudflare.com/email-routing/)
