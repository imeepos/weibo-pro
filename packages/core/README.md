# @sker/core

企业级依赖注入（DI）框架，受 Angular 启发，为 TypeScript/Node.js 应用提供类型安全、层次化、优雅的依赖管理与控制器/工具元数据基础设施。

## 核心职责

- **类型安全**：完整的 TypeScript 类型推导与检查
- **层次化注入器**：支持多级作用域（root → platform → application → feature）
- **多种提供者**：Value、Class、Factory、Existing、Constructor、LazyClass、LazyFactory
- **多值注入**：支持同一令牌提供多个值（`multi: true`）
- **生命周期管理**：`OnInit` / `OnDestroy` 钩子与 `APP_INITIALIZER` 异步初始化器（DAG 拓扑排序）
- **循环依赖处理**：`forwardRef` 解决循环引用，运行时自动检测并报告循环依赖
- **控制器元数据**：`@Controller` 等 HTTP 路由装饰器，为服务端路由提供元数据
- **工具元数据**：`@Tool` / `@ToolArg` 装饰器，供 MCP / Function Calling 工具构建
- **基础设施**：Logger、全局 ErrorHandler、ErrorSerializer、CORS 配置、`reflect-metadata` 导入

## 目录结构

```
src/
├── environment-injector.ts          # 核心注入器实现（EnvironmentInjector）
├── environment-injector-utils.ts    # 注入器工具函数
├── injector.ts                      # 注入器基类与类型定义（Type、AbstractType 等）
├── null-injector.ts                 # 空注入器（终止查找链）
├── injectable.ts                    # @Injectable() 装饰器（providedIn 作用域）
├── inject.ts                        # @Inject() 装饰器与元数据解析
├── parameter-decorators.ts          # @Optional / @Self / @SkipSelf / @Host
├── injection-token.ts               # InjectionToken / Record/Map/Set 令牌
├── host-attribute-token.ts          # 宿主属性令牌
├── provider.ts                      # Provider 类型定义（7 种提供者）
├── inject-options.ts                # 注入选项接口
├── internal-inject-flags.ts         # 内部注入标志位（位运算优化）
├── forward-ref.ts                   # 前向引用工具（含缓存）
├── lifecycle.ts                     # OnDestroy 生命周期
├── on-init.ts                       # OnInit 生命周期
├── app-initializer.ts               # APP_INITIALIZER 令牌
├── initializer-graph.ts             # 初始化器依赖图（DAG 拓扑排序）
├── controller.ts                    # @Controller 装饰器（HTTP 路由元数据）
├── mcp.ts                           # @Tool / @ToolArg 装饰器（工具元数据）
├── logger.ts                        # Logger 日志服务
├── error-handler.ts                 # 全局错误处理器
├── error-serializer.ts              # 错误序列化器（跨进程传输）
├── errors.ts                        # 错误类定义（NoRetryError 等）
├── root.ts                          # 根注入器导出（createRootInjector 等）
├── util.ts                          # isObservable / isPromise 工具
├── cors.ts                          # CORS 配置
└── index.ts                         # 统一导出（自动 import 'reflect-metadata'）
```

## 边界

- **✅ 负责**：依赖注入容器与作用域管理；控制器/工具装饰器元数据定义；生命周期与初始化器编排；日志、错误处理、CORS 等通用基础设施
- **❌ 不负责**：不实现 HTTP 服务器或具体路由处理（仅提供元数据，路由由消费方如 `apps/api` 实现）；不含业务实体与数据访问（见 `@sker/entities`）；不含状态管理（见 `@sker/store`）；不含 LLM 厂商适配（见 `@sker/compiler`）
- **对外依赖**：外部依赖 `reflect-metadata`、`zod`、`dayjs`；无其他 `@sker/*` 运行时依赖（被各包广泛消费）
- **被谁依赖**：`apps/api`、`apps/app`、`apps/bigscreen`、`apps/crawler`、`apps/storybook`、`apps/tests`、`apps/worker`；`packages/agent`、`packages/auth`、`packages/cli`、`packages/compiler`、`packages/crawler-core`、`packages/entities`、`packages/ip-proxy`、`packages/llm-protocol`、`packages/mq`、`packages/nlp`、`packages/redis`、`packages/sdk`、`packages/workflow`、`packages/workflow-ast`、`packages/workflow-browser`、`packages/workflow-run`、`packages/workflow-ui`

---

## 快速开始

```bash
pnpm add @sker/core reflect-metadata
```

```typescript
import { Injectable, createRootInjector, Inject } from '@sker/core';

@Injectable({ providedIn: 'root' })
class UserService {
  getUsers() { return ['Alice', 'Bob', 'Charlie']; }
}

@Injectable({ providedIn: 'root' })
class AppService {
  constructor(@Inject(UserService) private userService: UserService) {}
  start() { console.log('Users:', this.userService.getUsers()); }
}

const injector = createRootInjector();
injector.get(AppService).start();
```

## 核心概念

### 注入器层次结构

```
NullInjector (抛出错误)
    ↓
RootInjector (全局基础服务)
    ↓
PlatformInjector (跨应用共享)
    ↓
ApplicationInjector (应用级服务)
    ↓
FeatureInjector (功能模块服务)
```

```typescript
import {
  createRootInjector, createPlatformInjector,
  createApplicationInjector, createFeatureInjector
} from '@sker/core';

const root     = createRootInjector([{ provide: 'VERSION', useValue: '1.0.0' }]);
const platform = createPlatformInjector([{ provide: LoggerService, useClass: PlatformLogger }]);
const app      = createApplicationInjector([{ provide: ApiService, useClass: RestApiService }]);
const feature  = createFeatureInjector([{ provide: FeatureService, useClass: FeatureServiceImpl }], app);
```

### @Injectable 作用域

```typescript
@Injectable({ providedIn: 'root' })        // 根注入器注册（全局单例，推荐）
@Injectable({ providedIn: 'platform' })    // 平台注入器注册
@Injectable({ providedIn: 'application' }) // 应用注入器注册
@Injectable({ providedIn: 'feature' })     // 功能模块注册
@Injectable({ providedIn: 'auto' })        // 任何注入器自动解析（默认，最灵活）
@Injectable({ providedIn: null })          // 不自动注册，需手动配置
```

### 提供者类型

```typescript
{ provide: 'API_URL', useValue: 'https://api.example.com' }        // Value
{ provide: UserService, useClass: UserServiceImpl }                // Class
{ provide: DatabaseService, useFactory: (c) => new DatabaseService(c), deps: [Config] } // Factory
{ provide: 'Logger', useExisting: ConsoleLogger }                  // Existing（别名）
{ provide: UserService }                                           // Constructor（简写）
{ provide: TOKEN, useLazyClass: () => import('./svc').then(m => m.Service) }      // LazyClass
{ provide: TOKEN, useLazyFactory: () => import('./f').then(m => m.create()) }     // LazyFactory
```

### 参数装饰器

```typescript
class MyService {
  constructor(
    @Inject(LoggerService) @Optional() logger?: LoggerService, // 可选依赖，找不到返回 null
    @Inject(ConfigService) @Self() config: ConfigService,      // 只在当前注入器查找
    @Inject(CacheService) @SkipSelf() cache: CacheService,     // 跳过当前注入器，从父级查找
    @Inject(GlobalState) @Host() state: GlobalState            // 只在宿主注入器查找
  ) {}
}
```

### 多值注入

```typescript
const providers = [
  { provide: 'PLUGINS', useValue: pluginA, multi: true },
  { provide: 'PLUGINS', useValue: pluginB, multi: true }
];
const plugins = createRootInjector(providers).get('PLUGINS'); // [pluginA, pluginB]
```

### 生命周期与初始化器

```typescript
@Injectable()
class DatabaseService implements OnInit {
  @OnInit() async onInit() { await this.connect(); }   // 初始化时自动调用
  async onDestroy() { await this.disconnect(); }        // 销毁时自动调用
}

const injector = createRootInjector([DatabaseService]);
await injector.init();     // 触发所有 @OnInit 服务的 onInit()
await injector.destroy();  // 触发所有服务的 onDestroy()
```

```typescript
// APP_INITIALIZER：按依赖顺序执行异步初始化器
const dbInit: Initializer = { provide: new InjectionToken('DB_INIT'), init: async () => { await connectToDatabase(); } };
const cacheInit: Initializer = { provide: new InjectionToken('CACHE_INIT'), deps: [new InjectionToken('DB_INIT')], init: async () => { await initializeCache(); } };

createRootInjector([
  { provide: APP_INITIALIZER, useValue: dbInit, multi: true },
  { provide: APP_INITIALIZER, useValue: cacheInit, multi: true }
]).init();
```

### InjectionToken 与 ForwardRef

```typescript
const API_URL = new InjectionToken<string>('API_URL');
const url: string = injector.get(API_URL);   // 类型安全的令牌

// forwardRef 解决循环引用
@Injectable() class A { constructor(@Inject(forwardRef(() => B)) private b: B) {} }
@Injectable() class B { constructor(private a: A) {} }
```

## API 参考

- **创建注入器**：`createRootInjector(providers?)` / `createPlatformInjector(providers?)` / `createApplicationInjector(providers?)` / `createFeatureInjector(providers, parent)` / `createInjector(providers, parent?, scope?)`
- **获取注入器**：`getRootInjector()` / `getPlatformInjector()` / `root`（全局根注入器）
- **重置注入器（测试用）**：`resetRootInjector()` / `resetPlatformInjector()`
- **装饰器**：`@Injectable` / `@Inject` / `@Optional` / `@Self` / `@SkipSelf` / `@Host` / `@OnInit` / `@Controller` / `@Tool` / `@ToolArg`
- **注入器方法**：`injector.get(token, defaultValue?)` / `injector.set(providers)` / `injector.init()` / `injector.destroy()` / `injector.runInInjectionContext(fn)`
- **工具类**：`InjectionToken<T>` / `forwardRef(() => Type)` / `APP_INITIALIZER` / `ErrorSerializer` / `NoRetryError` / `Logger` / `ErrorHandler`

## 最佳实践

1. **使用 `providedIn: 'root'` 自动注册**，避免手动配置
2. **合理使用注入器层次**：全局服务放 root、跨应用共享放 platform、应用级放 application、功能模块放 feature
3. **优先使用类型令牌而非字符串**，需要语义化字符串时用 `InjectionToken`
4. **异步初始化使用 `APP_INITIALIZER`**，避免在构造函数中做异步操作
5. **测试时重置注入器**：`afterEach(() => { resetRootInjector(); resetPlatformInjector(); })`

## 技术亮点

- **位标志优化**：`internal-inject-flags.ts` 使用位运算代替对象属性检查（Optional/Self/SkipSelf/Host）
- **ForwardRef 缓存**：`forward-ref.ts` 使用 `WeakMap` 缓存避免重复解析
- **循环依赖检测**：`environment-injector.ts` 运行时追踪依赖路径并抛出清晰错误
- **初始化器 DAG 排序**：`initializer-graph.ts` 对有依赖关系的初始化器做拓扑排序

---

**代码即文档，简约即优雅。**
