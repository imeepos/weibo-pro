# @sker/auth

优雅的装饰器驱动的 Better Auth 插件框架，整合 @sker/core 依赖注入系统。

## 设计哲学

**存在即合理**：每个装饰器都有不可替代的语义，用于描述认证插件的结构
**优雅即简约**：装饰器即文档，代码自解释，无需额外注释
**类型安全**：充分利用 TypeScript + Zod 类型推断，提供端到端类型安全

## 目录结构

```
packages/auth/
├── src/
│   ├── core/                    # 核心类型和工具
│   │   ├── index.ts            # 导出所有核心模块
│   │   ├── tokens.ts           # InjectionToken 定义（元数据存储键）
│   │   ├── types.ts            # TypeScript 类型定义
│   │   └── utils.ts            # 工具函数（resolveConstructor）
│   ├── decorators/             # 装饰器定义
│   │   ├── index.ts            # 导出所有装饰器
│   │   ├── plugin.ts           # @AuthPlugin - 插件类装饰器
│   │   ├── entity.ts           # @Entity, @Field - 数据库实体装饰器
│   │   ├── endpoint.ts         # @Get, @Post, @Put, @Delete - HTTP 端点装饰器
│   │   ├── parameter.ts        # @Body, @Context, @Query, @Param - 参数装饰器
│   │   ├── hook.ts             # @AfterSignUp, @BeforeSignIn 等 - 钩子装饰器
│   │   └── rate-limit.ts       # @RateLimit - 限流装饰器
│   ├── compiler/               # 插件编译器
│   │   ├── index.ts            # 导出编译器
│   │   └── plugin-compiler.ts  # PluginCompiler 实现
│   ├── plugins/                # 内置插件示例
│   │   └── birthday/           # 生日插件示例
│   │       ├── index.ts
│   │       ├── birthday.plugin.ts   # 服务端插件
│   │       └── birthday.client.ts   # 客户端类型（可选）
│   ├── example.ts              # 完整使用示例
│   └── index.ts                # 包入口
├── package.json
├── tsconfig.json
├── README.md
└── CLAUDE.md                   # 本文档
```

## 核心类型系统

### 元数据类型 (src/core/types.ts)

```typescript
// 插件元数据
interface PluginMetadata {
  id: string;                    // 插件唯一标识
  description?: string;           // 插件描述
  target: Type<any>;             // 插件类构造函数
}

// 实体元数据（数据库表）
interface EntityMetadata {
  tableName: string;             // 表名
  extendUser?: boolean;          // 是否扩展 user 表
  target: Type<any>;             // 实体类构造函数
}

// 字段元数据
interface FieldMetadata {
  target: Type<any>;             // 实体类构造函数
  propertyKey: string | symbol;  // 属性名
  type: 'string' | 'number' | 'boolean' | 'date';
  required?: boolean;
  references?: { model: string; field: string };  // 外键
  defaultValue?: any;
  unique?: boolean;
}

// 端点元数据
interface EndpointMetadata {
  target: Type<any>;             // 插件类构造函数
  propertyKey: string | symbol;  // 方法名
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;                  // 路径，如 '/profile/me'
  requireAuth?: boolean;         // 是否需要认证
  rateLimit?: { window: number; max: number };
}

// 参数元数据
interface ParameterMetadata {
  target: Type<any>;
  propertyKey: string | symbol;
  parameterIndex: number;        // 参数位置
  type: 'body' | 'context' | 'query' | 'param';
  schema?: any;                  // Zod schema（用于 @Body）
  paramName?: string;            // 参数名（用于 @Param）
}

// 钩子元数据
interface HookMetadata {
  target: Type<any>;
  propertyKey: string | symbol;
  timing: 'before' | 'after';
  matcher: string | ((context: any) => boolean);  // 路径匹配器
}

// 限流元数据
interface RateLimitMetadata {
  target: Type<any>;
  propertyKey?: string | symbol;  // 可选（类级别限流时为空）
  pathMatcher: string | ((path: string) => boolean);
  window: number;                 // 时间窗口（秒）
  max: number;                    // 最大请求数
}
```

### InjectionToken 定义 (src/core/tokens.ts)

所有装饰器元数据通过 `@sker/core` 的 InjectionToken 存储在全局根注入器中：

```typescript
export const AUTH_PLUGIN = new InjectionToken<PluginMetadata[]>('AUTH_PLUGIN');
export const AUTH_ENTITY = new InjectionToken<EntityMetadata[]>('AUTH_ENTITY');
export const AUTH_FIELD = new InjectionToken<FieldMetadata[]>('AUTH_FIELD');
export const AUTH_ENDPOINT = new InjectionToken<EndpointMetadata[]>('AUTH_ENDPOINT');
export const AUTH_PARAMETER = new InjectionToken<ParameterMetadata[]>('AUTH_PARAMETER');
export const AUTH_HOOK = new InjectionToken<HookMetadata[]>('AUTH_HOOK');
export const AUTH_RATE_LIMIT = new InjectionToken<RateLimitMetadata[]>('AUTH_RATE_LIMIT');
```

## 装饰器 API

### 1. 插件级装饰器

#### @AuthPlugin(options)

标记插件类，定义插件 ID 和基础配置。必须与 `@Injectable()` 配合使用。

```typescript
// src/decorators/plugin.ts
@AuthPlugin({ id: 'profile', description: '用户资料管理插件' })
@Injectable()
export class ProfilePlugin {
  // ...
}
```

**原理**：
- 使用 `root.set()` 注册 `AUTH_PLUGIN` 元数据
- 同时注册插件类到 DI 容器（`provide: ctor, useClass: ctor`）
- 参考 @sker/workflow 的 `@Node` 装饰器

### 2. Schema 装饰器

#### @Entity(options)

标记数据库实体类，定义表名和选项。

```typescript
// src/decorators/entity.ts
@Entity({ tableName: 'userProfile', extendUser: false })
class UserProfile {
  // ...
}
```

#### @Field(options)

标记实体字段，定义字段类型、约束和关系。

```typescript
// src/decorators/entity.ts
@Field({
  type: 'string',
  required: true,
  references: { model: 'user', field: 'id' }
})
userId!: string;

@Field({ type: 'date', required: false })
birthday?: Date;
```

**原理**：
- 使用 `root.set()` 注册 `AUTH_ENTITY` 和 `AUTH_FIELD` 元数据
- 字段元数据包含 `target` (实体类) 和 `propertyKey` (属性名)
- 参考 @sker/workflow-ast 的 `@Input/@Output` 装饰器

### 3. Endpoint 装饰器

#### @Get(path, options?)
#### @Post(path, options?)
#### @Put(path, options?)
#### @Delete(path, options?)

定义 HTTP 端点，支持路径参数、认证和限流。

```typescript
// src/decorators/endpoint.ts
@Post('/profile/update', { requireAuth: true })
async updateProfile(@Body() body: any, @Context() ctx: any) {
  // ...
}

@Get('/profile/:userId')
async getProfileByUserId(@Context() ctx: any) {
  const userId = ctx.params?.userId;
  // ...
}
```

**原理**：
- 使用工厂函数 `createHttpMethodDecorator()` 创建装饰器
- 注册 `AUTH_ENDPOINT` 元数据，包含方法类型、路径、选项
- 类似 NestJS 的 `@Get/@Post` 装饰器

### 4. 参数装饰器

#### @Body(schema?)

注入请求体，支持 Zod schema 验证。

```typescript
// src/decorators/parameter.ts
const updateProfileSchema = z.object({
  bio: z.string().optional(),
  avatar: z.string().url().optional()
});

@Post('/profile/update')
async updateProfile(
  @Body(updateProfileSchema) body: { bio?: string; avatar?: string }
) {
  // body 已通过 Zod 验证
}
```

#### @Context()

注入 Better Auth 上下文对象（包含 `session`, `adapter`, `request` 等）。

```typescript
@Get('/profile/me', { requireAuth: true })
async getMyProfile(@Context() ctx: any) {
  const userId = ctx.context.session.user.id;
  // ...
}
```

#### @Query()

注入查询参数对象。

```typescript
@Get('/users/search')
async searchUsers(@Query() query: any) {
  const { keyword, page } = query;
  // ...
}
```

#### @Param(name)

注入路径参数。

```typescript
@Get('/profile/:userId')
async getProfile(@Param('userId') userId: string) {
  // ...
}
```

**原理**：
- 使用 `createParameterDecorator()` 工厂函数
- 注册 `AUTH_PARAMETER` 元数据，包含参数索引和类型
- 编译时通过反射注入正确的参数值
- 参考 @sker/core 的 `@Inject` 参数装饰器模式

### 5. Hook 装饰器

#### @AfterSignUp()
#### @BeforeSignUp()
#### @AfterSignIn()
#### @BeforeSignIn()

生命周期钩子，在用户注册/登录前后执行。

```typescript
// src/decorators/hook.ts
@AfterSignUp()
async onUserSignUp(@Context() ctx: any) {
  // 用户注册后自动创建资料
  await ctx.context.adapter.create({
    model: 'userProfile',
    data: {
      userId: ctx.context.session.user.id,
      bio: '',
      avatar: ''
    }
  });
}
```

#### @BeforeHook(options)
#### @AfterHook(options)

自定义钩子，支持路径匹配器。

```typescript
@BeforeHook({ matcher: (ctx) => ctx.path.startsWith('/admin') })
async checkAdminPermission(@Context() ctx: any) {
  // 检查管理员权限
}
```

**原理**：
- 注册 `AUTH_HOOK` 元数据，包含 timing 和 matcher
- matcher 支持字符串（精确匹配）或函数（动态匹配）
- 编译时转换为 Better Auth 的 `hooks.before/after` 格式

### 6. 限流装饰器

#### @RateLimit(options)

配置端点或插件的限流规则。可应用于类级别（全局）或方法级别（单个端点）。

```typescript
// src/decorators/rate-limit.ts
// 类级别（全局限流）
@AuthPlugin({ id: 'profile' })
@RateLimit({
  pathMatcher: (path) => path.startsWith('/profile'),
  window: 60,  // 60 秒
  max: 100     // 最多 100 次请求
})
@Injectable()
export class ProfilePlugin {
  // ...
}

// 方法级别（单个端点限流）
@Post('/profile/update')
@RateLimit({
  pathMatcher: '/profile/update',
  window: 60,
  max: 10
})
async updateProfile() {
  // ...
}
```

## PluginCompiler 编译器

### 核心职责

`PluginCompiler` 负责将装饰器元数据编译为 Better Auth 原生插件格式。

```typescript
// src/compiler/plugin-compiler.ts
@Injectable()
export class PluginCompiler {
  compile(): any[] {
    const pluginMetadatas = root.get(AUTH_PLUGIN, []);
    return pluginMetadatas.map(meta => this.compilePlugin(meta));
  }

  private compilePlugin(meta: PluginMetadata): any {
    return {
      id: meta.id,
      schema: this.compileSchema(meta.target),           // 数据库 schema
      endpoints: this.compileEndpoints(meta.target),     // HTTP 端点
      hooks: this.compileHooks(meta.target),             // 生命周期钩子
      rateLimit: this.compileRateLimit(meta.target),     // 限流配置
      $Infer: this.compileInfer(meta.target)             // TypeScript 类型推断
    };
  }
}
```

### 编译流程

```
装饰器定义（开发时）
  ↓ 使用 reflect-metadata 收集元数据
  ↓ 注册到全局 root 注入器（@sker/core）
  ↓
PluginCompiler 编译（运行时）
  ↓ 扫描 AUTH_PLUGIN Token 获取所有插件类
  ↓ 收集 @Entity/@Field 元数据 → 生成 Better Auth schema
  ↓ 收集 @Get/@Post 元数据 → 生成 Better Auth endpoints
  ↓ 收集 @Hook 元数据 → 生成 Better Auth hooks
  ↓ 收集 @RateLimit 元数据 → 生成 Better Auth rateLimit
  ↓
Better Auth 集成
  ↓ betterAuth({ plugins: [compiledPlugins] })
```

### 关键方法详解

#### 1. compileSchema(pluginClass)

将 `@Entity` 和 `@Field` 转换为 Better Auth schema 格式：

```typescript
// 输入：
@Entity({ tableName: 'userProfile' })
class UserProfile {
  @Field({ type: 'string', required: true, references: { model: 'user', field: 'id' } })
  userId!: string;
}

// 输出：
{
  userProfile: {
    fields: {
      userId: {
        type: 'string',
        required: true,
        references: { model: 'user', field: 'id' }
      }
    }
  }
}
```

#### 2. compileEndpoints(pluginClass)

将 `@Get/@Post` 转换为 Better Auth endpoints，并处理参数注入：

```typescript
// 输入：
@Post('/profile/update', { requireAuth: true })
async updateProfile(@Body() body: any, @Context() ctx: any) { ... }

// 输出：
{
  updateProfile: {
    path: '/profile/update',
    method: 'POST',
    requireAuth: true,
    handler: async (ctx) => {
      // 反射调用 updateProfile 方法
      const instance = root.get(ProfilePlugin);
      const args = [ctx.body, ctx];  // 根据 @Body, @Context 注入参数
      return await instance.updateProfile(...args);
    }
  }
}
```

**参数注入逻辑** (`executeEndpoint` 方法)：
1. 获取方法的所有 `AUTH_PARAMETER` 元数据
2. 按 `parameterIndex` 排序
3. 根据 `type` 注入对应值：
   - `body` → `ctx.body`
   - `context` → `ctx`
   - `query` → `ctx.query`
   - `param` → `ctx.params[paramName]`

#### 3. compileHooks(pluginClass)

将 `@Hook` 装饰器转换为 Better Auth hooks.before/after：

```typescript
// 输入：
@AfterSignUp()
async onUserSignUp(@Context() ctx: any) { ... }

// 输出：
{
  before: [],
  after: [
    {
      matcher: (ctx) => ctx.path === '/sign-up/email',
      handler: async (ctx) => {
        const instance = root.get(ProfilePlugin);
        return await instance.onUserSignUp(ctx);
      }
    }
  ]
}
```

#### 4. compileRateLimit(pluginClass)

转换 `@RateLimit` 为 Better Auth rateLimit 配置：

```typescript
// 输入：
@RateLimit({
  pathMatcher: '/profile/update',
  window: 60,
  max: 10
})

// 输出：
[
  {
    pathMatcher: (path) => path === '/profile/update',
    window: 60,
    max: 10
  }
]
```

#### 5. compileInfer(pluginClass)

生成 TypeScript 类型推断元数据（用于客户端类型安全）：

```typescript
// 输入：
@Entity({ tableName: 'userProfile' })
class UserProfile {
  @Field({ type: 'string' }) userId!: string;
  @Field({ type: 'date' }) birthday!: Date;
}

// 输出：
{
  userProfile: {
    userId: '',       // 类型占位符
    birthday: Date
  }
}
```

## 使用指南

### 1. 创建插件

```typescript
// src/plugins/profile/profile.plugin.ts
import { AuthPlugin, Entity, Field, Post, Get, Body, Context, AfterSignUp } from '@sker/auth';
import { Injectable } from '@sker/core';
import { z } from 'zod';

@Entity({ tableName: 'userProfile' })
class UserProfile {
  @Field({
    type: 'string',
    required: true,
    references: { model: 'user', field: 'id' }
  })
  userId!: string;

  @Field({ type: 'string', required: false })
  bio?: string;

  @Field({ type: 'string', required: false })
  avatar?: string;
}

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  avatar: z.string().url().optional()
});

@AuthPlugin({ id: 'profile', description: '用户资料管理插件' })
@Injectable()
export class ProfilePlugin {
  @Post('/profile/update', { requireAuth: true })
  async updateProfile(
    @Body(updateProfileSchema) body: { bio?: string; avatar?: string },
    @Context() ctx: any
  ) {
    await ctx.context.adapter.update({
      model: 'userProfile',
      where: [{ field: 'userId', value: ctx.context.session.user.id }],
      update: body
    });

    return { success: true, profile: body };
  }

  @Get('/profile/me', { requireAuth: true })
  async getMyProfile(@Context() ctx: any) {
    const profile = await ctx.context.adapter.findOne({
      model: 'userProfile',
      where: [{ field: 'userId', value: ctx.context.session.user.id }]
    });

    return { profile };
  }

  @AfterSignUp()
  async onUserSignUp(@Context() ctx: any) {
    await ctx.context.adapter.create({
      model: 'userProfile',
      data: {
        userId: ctx.context.session.user.id,
        bio: '',
        avatar: ''
      }
    });
  }
}
```

### 2. 服务端集成

```typescript
// apps/api/src/auth.ts
import { betterAuth } from 'better-auth';
import { compileAuthPlugins } from '@sker/auth';

const compiledPlugins = compileAuthPlugins();

export const auth = betterAuth({
  database: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL
  },
  plugins: compiledPlugins
});
```

### 3. 客户端使用

```typescript
// apps/web/src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000'
});

// 类型安全的 API 调用
await authClient.profile.updateProfile({
  bio: 'Hello World!',
  avatar: 'https://example.com/avatar.png'
});

const { profile } = await authClient.profile.getMyProfile();
console.log(profile);
```

## 与 @sker/core 的集成

### 依赖注入

所有插件类必须使用 `@Injectable()` 装饰器，以便 DI 容器管理生命周期：

```typescript
@AuthPlugin({ id: 'profile' })
@Injectable()
export class ProfilePlugin {
  constructor(
    private readonly cacheService: CacheService,  // 自动注入
    private readonly logger: LoggerService        // 自动注入
  ) {}

  @Post('/profile/update')
  async updateProfile(@Body() body: any) {
    await this.cacheService.set('profile', body);  // 使用注入的服务
    this.logger.log('Profile updated');
  }
}
```

### 元数据存储

所有装饰器元数据通过 `root.set()` 存储在全局根注入器中：

```typescript
// 装饰器内部
root.set([{
  provide: AUTH_PLUGIN,
  useValue: { ...options, target: ctor },
  multi: true  // 多提供者模式
}]);

// 编译器内部
const plugins = root.get(AUTH_PLUGIN, []);  // 获取所有插件元数据
```

## 与 NestJS 的对比

### 相似之处

✅ HTTP 方法装饰器（`@Get`, `@Post`, `@Put`, `@Delete`）
✅ 参数装饰器（`@Body`, `@Query`, `@Param`）
✅ 依赖注入驱动（构造函数注入，基于 @sker/core）
✅ 功能级装饰器粒度（方法级别）

### 差异之处

⚖️ **Schema 定义**：Better Auth 需要显式 `@Entity`/`@Field` 定义数据库结构
⚖️ **Hook 机制**：Better Auth 独有的 before/after hooks（类似中间件）
⚖️ **插件编译**：需要额外的 `PluginCompiler.compile()` 步骤将装饰器转换为原生格式
⚖️ **Context 对象**：`@Context()` 注入 Better Auth 上下文，而非 NestJS 的 ExecutionContext

## 示例：Birthday Plugin

完整示例见 `src/plugins/birthday/birthday.plugin.ts`。

```typescript
@Entity({ tableName: 'userBirthday' })
class UserBirthday {
  @Field({
    type: 'string',
    required: true,
    references: { model: 'user', field: 'id' }
  })
  userId!: string;

  @Field({ type: 'date', required: true })
  birthday!: Date;

  @Field({ type: 'string', required: false })
  zodiacSign?: string;
}

@AuthPlugin({ id: 'birthday', description: '用户生日管理插件' })
@Injectable()
export class BirthdayPlugin {
  @Post('/birthday/update', { requireAuth: true })
  async updateBirthday(
    @Body(updateBirthdaySchema) body: { birthday: string },
    @Context() ctx: any
  ) {
    const zodiacSign = this.calculateZodiacSign(new Date(body.birthday));
    await ctx.context.adapter.update({
      model: 'userBirthday',
      where: [{ field: 'userId', value: ctx.context.session.user.id }],
      update: { birthday: new Date(body.birthday), zodiacSign }
    });
    return { success: true, zodiacSign };
  }

  @Get('/birthday/me', { requireAuth: true })
  async getMyBirthday(@Context() ctx: any) {
    const birthday = await ctx.context.adapter.findOne({
      model: 'userBirthday',
      where: [{ field: 'userId', value: ctx.context.session.user.id }]
    });
    return { birthday };
  }

  @AfterSignUp()
  async onUserSignUp(@Context() ctx: any) {
    await ctx.context.adapter.create({
      model: 'userBirthday',
      data: {
        userId: ctx.context.session.user.id,
        birthday: new Date(),
        zodiacSign: null
      }
    });
  }

  private calculateZodiacSign(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    // 星座计算逻辑...
    return '白羊座';
  }
}
```

## 依赖关系

```json
{
  "dependencies": {
    "better-auth": "^1.4.2",      // Better Auth 核心库
    "kysely": "^0.28.8",          // Better Auth 使用的 SQL 构建器
    "@sker/core": "workspace:*",  // 依赖注入容器
    "zod": "^3.23.8"              // Schema 验证
  }
}
```

## 关键文件说明

| 文件 | 职责 |
|------|------|
| `src/core/tokens.ts` | 定义所有 InjectionToken（元数据存储键） |
| `src/core/types.ts` | 定义所有 TypeScript 类型 |
| `src/core/utils.ts` | `resolveConstructor()` 工具函数 |
| `src/decorators/plugin.ts` | `@AuthPlugin` 装饰器 |
| `src/decorators/entity.ts` | `@Entity`, `@Field` 装饰器 |
| `src/decorators/endpoint.ts` | `@Get`, `@Post`, `@Put`, `@Delete` 装饰器 |
| `src/decorators/parameter.ts` | `@Body`, `@Context`, `@Query`, `@Param` 装饰器 |
| `src/decorators/hook.ts` | `@AfterSignUp`, `@BeforeSignIn` 等钩子装饰器 |
| `src/decorators/rate-limit.ts` | `@RateLimit` 装饰器 |
| `src/compiler/plugin-compiler.ts` | `PluginCompiler` 编译器实现 |
| `src/plugins/birthday/birthday.plugin.ts` | Birthday 插件示例 |
| `src/example.ts` | 完整使用示例 |
| `src/index.ts` | 包入口，导出 `compileAuthPlugins()` |

## 最佳实践

1. **装饰器组合顺序**：
   ```typescript
   @AuthPlugin({ id: 'plugin' })     // 1. 插件装饰器
   @RateLimit({ ... })                // 2. 限流装饰器（可选）
   @Injectable()                      // 3. DI 装饰器
   export class MyPlugin { ... }
   ```

2. **Schema 验证**：始终使用 Zod schema 验证请求体
   ```typescript
   const schema = z.object({ ... });
   @Post('/endpoint')
   async handler(@Body(schema) body: z.infer<typeof schema>) {
     // body 已验证
   }
   ```

3. **Context 访问**：通过 `ctx.context` 访问 Better Auth 上下文
   ```typescript
   @Get('/me', { requireAuth: true })
   async getMe(@Context() ctx: any) {
     const user = ctx.context.session.user;  // 当前用户
     const adapter = ctx.context.adapter;     // 数据库适配器
   }
   ```

4. **Hook 使用**：优先使用具名钩子（`@AfterSignUp`），自定义钩子使用函数匹配器
   ```typescript
   @AfterSignUp()  // 推荐：语义清晰
   async onSignUp(@Context() ctx: any) { ... }

   @AfterHook({ matcher: (ctx) => ctx.path.includes('/sign-up') })  // 备选
   async onSignUp(@Context() ctx: any) { ... }
   ```

5. **限流配置**：敏感操作使用方法级限流，全局使用类级限流
   ```typescript
   @RateLimit({ pathMatcher: '/profile/update', window: 60, max: 10 })
   @Post('/profile/update')
   async updateProfile() { ... }
   ```

## 代码艺术家哲学

**存在即合理**：每个装饰器都有独特的语义使命
- `@AuthPlugin` → 插件身份标识
- `@Entity/@Field` → 数据库结构映射
- `@Get/@Post` → HTTP 接口定义
- `@Body/@Context` → 参数注入契约
- `@Hook` → 生命周期介入点
- `@RateLimit` → 访问控制策略

**优雅即简约**：代码即文档
- 装饰器本身就是最好的注释
- 类名 = 插件功能，方法名 = 端点语义
- 无需额外文档，结构即设计

**性能即艺术**：编译时 + 运行时优化
- 元数据收集在装饰器执行时完成（无运行时反射开销）
- PluginCompiler 一次编译，多次使用
- 参数注入通过预排序元数据实现（O(1) 查找）

**错误处理如为人处世的哲学**：
- Zod schema 在请求到达前验证数据
- `resolveConstructor()` 确保装饰器应用正确
- Better Auth 提供统一的错误响应格式

**日志是思想的表达**：
- 可通过 DI 注入 LoggerService 记录插件行为
- 编译器静默工作，只在异常时发声
- 插件方法内显式记录业务逻辑

## License

MIT
