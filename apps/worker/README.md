# @sker/worker

Cloudflare Worker 边缘代理服务，为爬虫与前端提供通用/微博专用 HTTP 代理与浏览器渲染能力。

## 核心职责

- 健康检查：`GET /health` 返回服务状态
- 通用代理：`POST /proxy` 透传任意 URL 请求，支持自定义 headers、cookies、user-agent、referer
- 微博专用代理：`POST /weibo-proxy` 在通用代理基础上附加 XSRF token 与微博请求头构造
- 浏览器渲染：`POST /browser-render` 使用 Cloudflare Browser Rendering API（puppeteer）渲染页面并返回 HTML
- 跨域处理：统一为响应附加 CORS 头，支持 OPTIONS 预检
- 可观测性：通过 Pipeline 绑定（`LOGS_STREAM`）输出结构化日志

## 目录结构

```
apps/worker/
├── src/
│   ├── index.ts                        # 入口：路由分发 + CORS + 统一错误处理
│   ├── handlers/
│   │   ├── health.handler.ts           # 健康检查
│   │   ├── proxy.handler.ts            # 通用代理
│   │   ├── weibo-proxy.handler.ts      # 微博专用代理
│   │   └── browser-render.handler.ts   # 浏览器渲染
│   ├── utils/                          # cookie 解析、CORS、请求头构造、日志
│   └── types.ts                        # 请求/响应/环境（Env）类型
├── wrangler.jsonc                      # Worker + Browser Rendering + Pipeline 绑定
└── vitest.config.ts
```

## 边界

- **✅ 负责**：边缘代理、微博请求封装、浏览器渲染、CORS、健康检查
- **❌ 不负责**：不做业务数据分析；不存储数据；不实现爬虫逻辑（只做网络转发与渲染）
- **对外依赖**：`@sker/core`、`@sker/sdk`（测试辅助）；外部依赖 wrangler、@cloudflare/puppeteer、@cloudflare/workers-types、zod；平台绑定 Browser Rendering（BROWSER）与 Pipeline（LOGS_STREAM）
- **被谁依赖**：作为顶层应用，不被其他包 import；被 `@sker/api` / `@sker/bigscreen` / `@sker/crawler` 作为网络代理消费

## 常用命令

```bash
pnpm dev:start     # wrangler dev 本地调试
pnpm deploy        # 部署到 Cloudflare
pnpm tail          # 实时日志
pnpm test          # 单元测试
```
