# @sker/auth

基于 Better Auth 的认证与授权模块，将 `@sker/core` 的 `@Controller` 装饰器类编译为 Better Auth 插件端点，并提供 RBAC 权限中间件与 OpenAPI 生成能力。

## 核心职责

- **控制器 → Better Auth 插件**：`createSkerAuthPlugin(providers)` 将注册的控制器编译为 Better Auth 插件端点
- **端点工厂**：`controllerFactory` 读取控制器装饰器元数据，生成 Better Auth `Endpoint` 及请求参数注入逻辑
- **RBAC 权限**：`requireAuth` / `requireAdmin` / `requireAnyRole` / `requireAllRoles` 权限中间件
- **OpenAPI 生成**：`zodToOpenAPI` 将 Zod schema 转换为 OpenAPI 3.0 规范，用于文档/校验
- **DI 集成**：提供 `BETTER_AUTH`、`BETTER_AUTH_CONTEXT` 注入令牌，与 `@sker/core` 容器无缝衔接

## 目录结构

```
src/
├── index.ts                            # 统一导出
├── plugin.ts                           # createSkerAuthPlugin：Better Auth 插件工厂
├── factory/                            # 控制器 → Better Auth 端点编译层
│   ├── index.ts                        # 工厂导出
│   ├── controller.factory.ts           # controllerFactory：将控制器类转换为端点
│   ├── controller.factory.test.ts      # 端点工厂测试
│   ├── factory.types.ts                # 类型定义（EndpointConfig、RequestContext、RouteMetadata 等）
│   ├── metadata.extractor.ts           # 提取控制器路径/方法/路由参数元数据
│   ├── schema.builder.ts               # 基于 Zod 构建请求/响应校验 schema
│   ├── parameter.injector.ts           # 请求参数注入（Body/Query/Param/Header/Context）
│   ├── openapi.builder.ts              # 构建 OpenAPI 请求/响应/参数描述
│   ├── file.handler.ts                 # 文件上传处理
│   └── tokens.ts                       # BETTER_AUTH、BETTER_AUTH_CONTEXT 注入令牌
├── permission/                         # RBAC 权限
│   ├── index.ts                        # 权限导出
│   ├── permission.types.ts             # 类型定义（PermissionConfig、RoleRequirement 等）
│   ├── permission.checker.ts           # 权限检查逻辑
│   └── permission.middleware.ts        # requireAuth / requireAdmin / requireAnyRole / requireAllRoles
└── openapi/                            # OpenAPI 工具
    ├── index.ts                        # 导出
    ├── openapi.types.ts                # OpenAPI 类型定义
    └── zod-to-openapi.ts               # zodToOpenAPI：Zod → OpenAPI 转换
```

## 快速开始

```typescript
import { betterAuth } from 'better-auth';
import { createSkerAuthPlugin, controllerFactory, BETTER_AUTH } from '@sker/auth';
import { Controller, Get, Inject } from '@sker/core';

// 1. 定义控制器（使用 @sker/core 的 @Controller 元数据）
@Controller('profile')
export class ProfileController {
  @Get('me')
  async getMyProfile(@Inject(BETTER_AUTH) auth: any) {
    // ...
  }
}

// 2. 编译为 Better Auth 插件
const authPlugin = createSkerAuthPlugin([
  { provide: ProfileController, useClass: ProfileController },
]);

// 3. 接入 Better Auth
export const auth = betterAuth({
  database: { provider: 'postgresql', url: process.env.DATABASE_URL },
  plugins: [authPlugin],
});
```

### 权限中间件

```typescript
import { requireAuth, requireAdmin, requireAnyRole } from '@sker/auth';

// 在服务端请求处理中使用 RBAC 中间件
app.use('/admin/**', requireAdmin);
app.use('/user/**', requireAuth);
app.use('/moderator/**', requireAnyRole(['admin', 'moderator']));
```

## 边界

- **✅ 负责**：基于 Better Auth 的认证/会话接入；控制器端点编译与参数注入；RBAC 权限中间件；OpenAPI schema 生成
- **❌ 不负责**：不定义数据库实体与用户模型（见 `@sker/entities`）；不提供 API 客户端类型（见 `@sker/sdk`）；不包含具体业务控制器实现（由 `apps/api` 提供）
- **对外依赖**：`@sker/core`（DI 与控制器元数据）；外部依赖 `better-auth`、`better-call`、`kysely`、`zod`、`reflect-metadata`
- **被谁依赖**：`apps/api`（`main.ts` 接入插件、`middleware/auth.middleware.ts` 使用 `BETTER_AUTH`）
