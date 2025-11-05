# @sker/api

NestJS API 服务，Controller 层使用 NestJS，Service 层使用 @sker/core DI。

## 启动

```bash
pnpm dev
```

## 访问

```bash
curl http://localhost:3000
```

返回：`Hello World from @sker/core!`

## 架构

- **Controller**: NestJS 负责 HTTP 层
- **Service**: @sker/core 负责业务逻辑
