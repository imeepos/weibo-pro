# @sker/email-d1

基于 Cloudflare Email Routing + D1 的临时邮箱服务，接收邮件并落库，提供查询最新邮件的 REST API。

## 核心职责

- 接收邮件：Cloudflare `email` handler 解析 RFC822 邮件（From/Subject/正文）并写入 D1
- 查询最新邮件：`GET /api/latest?address=...` 返回该地址最新一封邮件（读取后删除，一次性消费）
- 简单邮件解析：基于行的解析器，提取发件人、主题与纯文本正文
- 数据库：D1 `emails` 表 + 索引，由 `schema.sql` 管理
- CORS 支持：API 响应携带 `Access-Control-Allow-Origin: *`

## 目录结构

```
apps/email-d1/
├── src/
│   └── index.ts           # Worker 入口：email handler + fetch API
├── schema.sql             # D1 emails 表结构（字段与索引）
├── wrangler.toml          # Cloudflare Worker + D1 数据库绑定
├── tsconfig.json
└── package.json
```

## 边界

- **✅ 负责**：邮件接收、解析、持久化到 D1、按地址查询最新邮件
- **❌ 不负责**：不提供邮件发送；不做身份认证/鉴权；不依赖任何 `@sker/*` workspace 包
- **对外依赖**：无 `@sker/*` workspace 依赖；外部依赖 wrangler、@cloudflare/workers-types；平台能力依赖 Cloudflare Email Routing 与 D1
- **被谁依赖**：作为顶层应用，不被其他包依赖

## 启动与部署

```bash
pnpm d1:create                # 创建 D1 数据库（将 database_id 填入 wrangler.toml）
pnpm d1:execute               # 本地初始化表结构
pnpm d1:execute-remote        # 生产初始化表结构
pnpm dev                      # 本地开发（http://localhost:8787）
pnpm deploy                   # 部署到 Cloudflare
```

部署后在 Cloudflare Dashboard 配置 Email Routing：将域名邮件流转发到该 Worker（Routing rule → Send to Worker）。

### API 示例

```bash
# 查询最新邮件（读取后即删除）
curl "https://email-d1.<your-subdomain>.workers.dev/api/latest?address=test@yourdomain.com"
```
