# @sker/redis

企业级 Redis 客户端包装（基于 ioredis），提供类型安全的数据操作、自动序列化、Pipeline 批量操作与依赖注入支持。

## 核心职责

- 类型安全封装：`RedisClient` 泛型推导，对象自动 JSON 序列化/反序列化
- 完整数据结构支持：String、Hash、Set、Sorted Set、List、Key 操作及 Pub/Sub
- Pipeline 批量操作：`RedisPipeline` 链式攒批，一次网络往返执行多条命令
- 依赖注入集成：通过 `@sker/core` 的 `@Injectable` 注册，开箱即用
- 配置灵活：`redisConfigFactory` 从 `REDIS_URL` 环境变量读取，或直接传 `ioredis` 配置
- 单文件架构：核心实现集中在 `src/index.ts`

## 目录结构

```
packages/redis/
├── src/
│   └── index.ts                       # 核心实现（单文件）：
│                                       #   RedisClient（类型安全操作 + 自动序列化 + Pub/Sub）
│                                       #   RedisPipeline（链式批量操作）
│                                       #   redisConfigFactory（环境变量配置工厂）
├── package.json
├── tsconfig.json
├── tsup.config.ts                     # 构建配置（ESM + CJS 双格式）
└── CLAUDE.md                          # 内部约定文档
```

## 边界

- **✅ 负责**：Redis 连接管理、类型安全的增删改查、自动序列化、Pipeline 批量命令、Pub/Sub、TTL 过期管理
- **❌ 不负责**：缓存键的业务命名规范（由调用方维护前缀）；Redis 集群的运维与部署；分布式锁等高层模式封装（可在上层服务实现）
- **对外依赖**：`@sker/core`（DI 装饰器）；外部：`ioredis`
- **被谁依赖**：`apps/api`、`packages/entities`（浏览器/调度订阅）、`packages/ip-proxy`（代理缓存与计分）、`packages/workflow-run`（Store 访问、账号监控/同步、调度器）

## 快速开始

```typescript
import { RedisClient, redisConfigFactory } from '@sker/redis';
import { createRootInjector } from '@sker/core';

const injector = createRootInjector();
const redis = injector.get(RedisClient);

// 字符串 + 对象自动序列化
await redis.set('user:name', 'Alice', 3600);
await redis.set('user:profile', { id: 1, name: 'Alice', age: 25 });
const profile = await redis.get<{ id: number; name: string; age: number }>('user:profile');

// Sorted Set 排行榜
await redis.zadd('leaderboard', 100, 'user:1');
const top10 = await redis.zrevrange('leaderboard', 0, 9);

// Pipeline 批量操作
const pipeline = redis.pipeline();
pipeline.set('key:1', 'v1').zincrby('scores', 50, 'player1').hset('user:1', 'name', 'Alice');
const results = await pipeline.exec();

// Pub/Sub
const unsubscribe = redis.subscribe('channel', (ch, msg) => console.log(msg));
await redis.publish('channel', 'hello');
unsubscribe();

await redis.close();
```

### 配置

```bash
# .env
REDIS_URL=redis://localhost:6379/0
```

或自定义 ioredis 配置：

```typescript
const client = new RedisClient(new Redis({ host: 'localhost', port: 6379, db: 0 }));
```

## 设计哲学

- **存在即合理** - 每个 API 方法都有不可替代的使用场景
- **优雅即简约** - 自动序列化让代码更简洁，无需手动处理 JSON
- **性能即艺术** - Pipeline 批量操作体现性能与优雅的平衡
- **类型安全即契约** - 泛型推导保障编译时类型检查

---

**代码即文档，简约即优雅。**
