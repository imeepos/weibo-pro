---
name: dependency-injection
description: 使用 @sker/core 依赖注入容器创建可注入服务、定义 Provider、与 NestJS 集成。当需要创建新服务、配置依赖、或理解双容器模式时使用。
---

# 依赖注入模式

本项目使用 @sker/core 的 DI 容器管理全局服务，NestJS 作为 HTTP 层 facade。

## 核心文件

- DI 容器：`packages/core/src/environment-injector.ts`
- 全局根注入器：`packages/core/src/root.ts`

## 可注入服务定义

```typescript
import { Injectable, Inject } from '@sker/core';

@Injectable()
export class MyService {
  constructor(
    @Inject(OtherService) private other: OtherService
  ) {}

  async doSomething(): Promise<void> {
    // 业务逻辑
  }
}
```

## Provider 类型

```typescript
import { Provider, root } from '@sker/core';

// Value Provider
{ provide: CONFIG_TOKEN, useValue: { apiUrl: 'https://api.example.com' } }

// Class Provider
{ provide: MyService, useClass: MyServiceImpl }

// Factory Provider
{ provide: DataSource, useFactory: (config: Config) => new DataSource(config), deps: [Config] }

// Existing Provider (别名)
{ provide: 'MyServiceAlias', useExisting: MyService }

// Multi Provider
{ provide: INITIALIZERS, useValue: myInitializer, multi: true }
```

## 与 NestJS 集成

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { root } from '@sker/core';

@Module({
  controllers: [MyController],
  providers: [
    { provide: MyService, useFactory: () => root.get(MyService) },
    { provide: CacheService, useFactory: () => root.get(CacheService) },
  ],
})
export class AppModule {}
```

## 初始化流程

```typescript
// apps/api/src/main.ts
import 'reflect-metadata';
import { root } from '@sker/core';
import { entitiesProviders } from '@sker/entities';

async function bootstrap() {
  // 1. 注册 providers
  root.set([...entitiesProviders]);

  // 2. 初始化
  await root.init();

  // 3. 启动 NestJS
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
```

## 作用域选择

- `'root'`: 全局单例服务（默认）
- `'platform'`: 跨应用共享服务
- `'application'`: 应用级服务
- `'auto'`: 任何注入器都可以自动解析

## 生命周期钩子

- `APP_INITIALIZER`: 启动时初始化（如数据库连接）
- `@OnInit()`: 服务实例化后调用
- `OnDestroy`: 销毁时调用

## 关键要点

1. **入口文件必须导入 `reflect-metadata`**
2. **NestJS 中通过 `root.get()` 获取服务**
3. **循环依赖使用 `forwardRef()` 解决**
4. **全局服务注册到 @sker/core，不在 NestJS 中重复实例化**

## 参考实现

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `packages/entities/src/providers.ts`
