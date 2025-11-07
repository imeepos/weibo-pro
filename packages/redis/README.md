# @sker/redis

企业级 Redis 客户端包装，提供类型安全的数据操作和依赖注入支持。

## 核心理念

Redis 操作不应繁琐复杂。`@sker/redis` 提供优雅的 API 封装，自动处理序列化/反序列化，让您专注于业务逻辑而非底层细节。

## 特性

- 🎯 **类型安全** - 完整的 TypeScript 泛型支持，自动类型推导
- 📦 **自动序列化** - 对象自动转换为 JSON，透明处理复杂数据类型
- ⚡ **Pipeline 支持** - 批量操作减少网络往返，提升性能
- 🔌 **依赖注入** - 与 `@sker/core` 深度集成，开箱即用
- 🏗️ **完整的数据类型** - 支持 String、Hash、Set、Sorted Set、List
- 🔧 **灵活配置** - 通过环境变量或工厂函数配置连接
- 🚀 **基于 ioredis** - 底层使用成熟稳定的 ioredis 客户端

## 快速开始

### 安装

```bash
pnpm add @sker/redis @sker/core ioredis
```

### 配置环境变量

```bash
# .env
REDIS_URL=redis://localhost:6379
```

### 基础使用

```typescript
import { RedisClient, redisConfigFactory } from '@sker/redis';
import { createRootInjector } from '@sker/core';

// 创建注入器并注册 RedisClient
const injector = createRootInjector();

// 获取 Redis 客户端实例
const redis = injector.get(RedisClient);

// 字符串操作
await redis.set('user:name', 'Alice', 3600); // TTL: 1小时
const name = await redis.get<string>('user:name'); // "Alice"

// 对象自动序列化
await redis.set('user:profile', { id: 1, name: 'Alice', age: 25 });
const profile = await redis.get<{ id: number; name: string; age: number }>('user:profile');
// { id: 1, name: 'Alice', age: 25 }

// 有序集合 - 排行榜
await redis.zadd('leaderboard', 100, 'user:1');
await redis.zincrby('leaderboard', 50, 'user:1');
const topUsers = await redis.zrevrange('leaderboard', 0, 9); // 前10名
```

## 核心概念

### 1. RedisClient - 企业级客户端

提供类型安全的 Redis 操作封装，自动处理数据序列化。

#### 字符串操作

```typescript
// 设置值（支持 TTL）
await redis.set('key', 'value', 3600); // 1小时后过期
await redis.setex('key', 3600, 'value'); // 等同于上面
await redis.setnx('key', 'value'); // 仅在键不存在时设置

// 获取值（泛型类型推导）
const str = await redis.get<string>('key');
const obj = await redis.get<UserProfile>('user:profile');
const num = await redis.get<number>('counter');
```

#### 有序集合（Sorted Set）

适用于排行榜、时间线等场景：

```typescript
// 添加成员
await redis.zadd('scores', 100, 'player1');
await redis.zadd('scores', 200, 'player2');

// 增加分数
await redis.zincrby('scores', 50, 'player1'); // player1: 150

// 获取分数
const score = await redis.zscore('scores', 'player1'); // 150

// 范围查询（按排名）
const top10 = await redis.zrevrange('scores', 0, 9); // 前10名
const bottom10 = await redis.zrange('scores', 0, 9); // 后10名

// 范围查询（按分数）
const highScorers = await redis.zrangebyscore('scores', 100, 500);

// 获取总数
const total = await redis.zcard('scores');

// 弹出最高分
const winner = await redis.zpopmax('scores');
// { member: 'player2', score: 200 }
```

#### 哈希（Hash）

适用于存储对象字段：

```typescript
// 批量设置
await redis.hmset('user:1', {
  name: 'Alice',
  age: 25,
  email: 'alice@example.com'
});

// 单个字段设置
await redis.hset('user:1', 'lastLogin', Date.now());

// 获取单个字段
const name = await redis.hget<string>('user:1', 'name');

// 获取所有字段
const user = await redis.hgetall('user:1');
// { name: 'Alice', age: '25', email: 'alice@example.com', lastLogin: '...' }

// 删除字段
await redis.hdel('user:1', 'email', 'lastLogin');
```

#### 集合（Set）

适用于标签、去重等场景：

```typescript
// 添加成员
await redis.sadd('tags:post:1', 'javascript', 'redis', 'typescript');

// 检查成员
const exists = await redis.sismember('tags:post:1', 'redis'); // true

// 移除成员
await redis.srem('tags:post:1', 'javascript');

// 获取成员数
const count = await redis.scard('tags:post:1'); // 2

// 获取所有成员
const tags = await redis.smembers('tags:post:1');
// ['redis', 'typescript']
```

#### 列表（List）

适用于队列、最新消息等场景：

```typescript
// 左侧推入（头部插入）
await redis.lpush('notifications', 'msg1', 'msg2', 'msg3');
```

#### 键操作

```typescript
// 删除键
await redis.del('key');

// 检查存在
const exists = await redis.exists('key'); // true/false

// 设置过期时间
await redis.expire('key', 3600); // 1小时后过期

// 获取剩余时间
const ttl = await redis.ttl('key'); // 秒数，-1 表示永久，-2 表示不存在

// 模糊匹配键
const keys = await redis.keys('user:*'); // ['user:1', 'user:2', ...]

// 关闭连接
await redis.close();
```

---

### 2. RedisPipeline - 批量操作

Pipeline 允许一次性发送多个命令，减少网络往返，显著提升性能。

```typescript
// 创建 Pipeline
const pipeline = redis.pipeline();

// 链式添加命令
pipeline
  .set('user:1:name', 'Alice')
  .set('user:1:age', '25', 3600)
  .zadd('active_users', Date.now(), 'user:1')
  .hmset('user:1:profile', { bio: 'Developer', city: 'Beijing' })
  .expire('user:1:age', 3600);

// 原子执行所有命令
const results = await pipeline.exec();

// 检查结果
results?.forEach(([err, result], index) => {
  if (err) {
    console.error(`命令 ${index} 失败:`, err);
  } else {
    console.log(`命令 ${index} 结果:`, result);
  }
});
```

**Pipeline 支持的操作：**
- 字符串：`get`, `set`
- 有序集合：`zadd`, `zincrby`
- 哈希：`hmset`, `hset`
- 键操作：`del`, `expire`

**性能对比：**
```typescript
// ❌ 慢：每次操作一个网络往返
for (let i = 0; i < 100; i++) {
  await redis.set(`key:${i}`, `value:${i}`);
}

// ✅ 快：100个命令仅一次网络往返
const pipeline = redis.pipeline();
for (let i = 0; i < 100; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
```

---

### 3. 数据序列化机制

`@sker/redis` 自动处理复杂数据类型的序列化/反序列化。

```typescript
// 对象自动序列化为 JSON
const user = { id: 1, name: 'Alice', tags: ['developer', 'writer'] };
await redis.set('user:1', user);

// 自动反序列化为对象（类型安全）
const retrieved = await redis.get<typeof user>('user:1');
// { id: 1, name: 'Alice', tags: ['developer', 'writer'] }

// 原始字符串直接存储
await redis.set('message', 'Hello World');
const msg = await redis.get<string>('message'); // "Hello World"

// 数字也可以序列化
await redis.set('counter', 42);
const count = await redis.get<number>('counter'); // 42
```

**内部实现：**
- 存储时：非字符串自动 `JSON.stringify()`
- 读取时：尝试 `JSON.parse()`，失败则返回原始字符串
- 完全透明，开发者无需手动处理

---

## 实际应用示例

### 1. 缓存服务

```typescript
import { Injectable, Inject } from '@sker/core';
import { RedisClient } from '@sker/redis';

@Injectable({ providedIn: 'root' })
export class CacheService {
  constructor(
    @Inject(RedisClient) private readonly redis: RedisClient
  ) {}

  // 获取缓存，不存在则执行 factory 并缓存
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const cached = await this.redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const data = await factory();
    await this.redis.setex(key, ttl, data);
    return data;
  }

  // 缓存失效
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
    }
  }
}
```

### 2. 会话管理

```typescript
@Injectable()
export class SessionService {
  constructor(@Inject(RedisClient) private redis: RedisClient) {}

  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    const key = `session:${sessionId}`;
    await this.redis.setex(key, 86400, { userId, ...data }); // 24小时
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any | null> {
    return this.redis.get(`session:${sessionId}`);
  }

  async extendSession(sessionId: string): Promise<void> {
    await this.redis.expire(`session:${sessionId}`, 86400);
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### 3. 排行榜系统

```typescript
@Injectable()
export class LeaderboardService {
  constructor(@Inject(RedisClient) private redis: RedisClient) {}

  // 增加用户分数
  async incrementScore(userId: string, points: number): Promise<void> {
    await this.redis.zincrby('leaderboard', points, userId);
  }

  // 获取用户排名（从1开始）
  async getRank(userId: string): Promise<number | null> {
    const members = await this.redis.zrevrange('leaderboard', 0, -1);
    const rank = members.indexOf(userId);
    return rank === -1 ? null : rank + 1;
  }

  // 获取前N名
  async getTopN(n: number): Promise<Array<{ userId: string; score: number }>> {
    const results = await this.redis.zrevrange('leaderboard', 0, n - 1, true);
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        userId: results[i],
        score: parseFloat(results[i + 1])
      });
    }
    return leaderboard;
  }

  // 重置排行榜
  async reset(): Promise<void> {
    await this.redis.del('leaderboard');
  }
}
```

### 4. 速率限制（Rate Limiting）

```typescript
@Injectable()
export class RateLimiterService {
  constructor(@Inject(RedisClient) private redis: RedisClient) {}

  // 检查是否超过限制
  async checkLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await this.redis.get<number>(key) || 0;

    if (current >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    const pipeline = this.redis.pipeline();
    if (current === 0) {
      pipeline.set(key, '1', windowSeconds);
    } else {
      pipeline.set(key, String(current + 1), windowSeconds);
    }
    await pipeline.exec();

    return {
      allowed: true,
      remaining: maxRequests - current - 1
    };
  }
}
```

### 5. 实时统计

```typescript
@Injectable()
export class AnalyticsService {
  constructor(@Inject(RedisClient) private redis: RedisClient) {}

  // 记录页面访问
  async trackPageView(page: string, userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const pipeline = this.redis.pipeline();

    // 页面总访问量
    pipeline.zincrby(`pv:${today}`, 1, page);

    // 独立访客（使用 Set 去重）
    pipeline.sadd(`uv:${page}:${today}`, userId);

    await pipeline.exec();
  }

  // 获取页面统计
  async getPageStats(page: string, date: string): Promise<{
    pageViews: number;
    uniqueVisitors: number;
  }> {
    const [pv, uv] = await Promise.all([
      this.redis.zscore(`pv:${date}`, page) || 0,
      this.redis.scard(`uv:${page}:${date}`)
    ]);

    return {
      pageViews: pv,
      uniqueVisitors: uv
    };
  }
}
```

---

## 配置

### 环境变量配置

```bash
# .env
REDIS_URL=redis://localhost:6379/0
REDIS_URL=redis://:password@localhost:6379/1
REDIS_URL=rediss://user:password@redis.example.com:6380/2
```

### 自定义配置工厂

```typescript
import { RedisClient, redisConfigFactory } from '@sker/redis';
import { Redis } from 'ioredis';

// 方式1: 使用默认工厂（从环境变量读取）
const redis1 = new RedisClient(new Redis(redisConfigFactory()));

// 方式2: 自定义配置
const redis2 = new RedisClient(new Redis({
  host: 'localhost',
  port: 6379,
  password: 'secret',
  db: 0,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
}));

// 方式3: 通过依赖注入
import { createRootInjector } from '@sker/core';

const injector = createRootInjector([
  {
    provide: RedisClient,
    useFactory: () => new RedisClient(new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    })),
    deps: []
  }
]);

const redis = injector.get(RedisClient);
```

---

## API 参考

### RedisClient

#### 字符串操作
- `get<T>(key: string): Promise<T | null>`
- `set(key: string, value: any, ttl?: number): Promise<void>`
- `setex(key: string, seconds: number, value: any): Promise<void>`
- `setnx(key: string, value: any): Promise<number>`

#### 有序集合操作
- `zadd(key: string, score: number, member: string): Promise<number>`
- `zincrby(key: string, increment: number, member: string): Promise<number>`
- `zscore(key: string, member: string): Promise<number | null>`
- `zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>`
- `zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>`
- `zrangebyscore(key: string, min: number, max: number, withScores?: boolean): Promise<string[]>`
- `zcard(key: string): Promise<number>`
- `zpopmax(key: string): Promise<{ member: string; score: number } | null>`

#### 哈希操作
- `hmset(key: string, data: Record<string, any>): Promise<string>`
- `hset(key: string, field: string, value: any): Promise<number>`
- `hget<T>(key: string, field: string): Promise<T | null>`
- `hgetall(key: string): Promise<Record<string, string>>`
- `hdel(key: string, ...fields: string[]): Promise<number>`

#### 集合操作
- `sadd(key: string, ...members: string[]): Promise<number>`
- `sismember(key: string, member: string): Promise<boolean>`
- `srem(key: string, ...members: string[]): Promise<number>`
- `scard(key: string): Promise<number>`
- `smembers(key: string): Promise<string[]>`

#### 列表操作
- `lpush(key: string, ...elements: string[]): Promise<number>`

#### 键操作
- `del(key: string): Promise<void>`
- `exists(key: string): Promise<boolean>`
- `expire(key: string, seconds: number): Promise<number>`
- `ttl(key: string): Promise<number>`
- `keys(pattern: string): Promise<string[]>`
- `close(): Promise<void>`

#### Pipeline
- `pipeline(): RedisPipeline`

### RedisPipeline

#### 链式操作
- `get(key: string): RedisPipeline`
- `set(key: string, value: string, ttl?: number): RedisPipeline`
- `zadd(key: string, score: number, member: string): RedisPipeline`
- `zincrby(key: string, increment: number, member: string): RedisPipeline`
- `del(key: string): RedisPipeline`
- `expire(key: string, seconds: number): RedisPipeline`
- `hmset(key: string, data: Record<string, any>): RedisPipeline`
- `hset(key: string, field: string, value: any): RedisPipeline`

#### 执行
- `exec(): Promise<[Error | null, any][] | null>`

---

## 最佳实践

### 1. 使用类型推导保障类型安全

```typescript
// ✅ 推荐：明确类型
interface UserProfile {
  id: number;
  name: string;
  email: string;
}

const profile = await redis.get<UserProfile>('user:1');
// profile 的类型是 UserProfile | null

// ❌ 避免：缺少类型
const profile = await redis.get('user:1');
// profile 的类型是 string | null，丢失了结构信息
```

### 2. 合理设置 TTL

```typescript
// ✅ 推荐：为缓存设置过期时间
await redis.set('cache:data', data, 300); // 5分钟

// ❌ 避免：永久缓存可能导致内存泄漏
await redis.set('cache:data', data);
```

### 3. 使用 Pipeline 批量操作

```typescript
// ✅ 推荐：批量操作使用 Pipeline
const pipeline = redis.pipeline();
users.forEach(user => {
  pipeline.set(`user:${user.id}`, user);
});
await pipeline.exec();

// ❌ 避免：循环中的单个操作
for (const user of users) {
  await redis.set(`user:${user.id}`, user); // 性能差
}
```

### 4. 使用命名空间避免键冲突

```typescript
// ✅ 推荐：使用前缀分组键
await redis.set('user:1:profile', profile);
await redis.set('session:abc123', sessionData);
await redis.zadd('leaderboard:daily', score, userId);

// ❌ 避免：扁平化的键名
await redis.set('profile', profile);
await redis.set('session', sessionData);
```

### 5. 错误处理

```typescript
// ✅ 推荐：处理可能的错误
try {
  const data = await redis.get<UserData>('user:1');
  if (data === null) {
    // 处理不存在的情况
  }
} catch (error) {
  // 处理 Redis 连接错误
  console.error('Redis error:', error);
}
```

### 6. 关闭连接

```typescript
// 应用关闭时清理资源
process.on('SIGTERM', async () => {
  await redis.close();
  process.exit(0);
});
```

---

## 设计哲学

这个 Redis 客户端包装遵循代码艺术家的核心原则：

- **存在即合理** - 每个 API 方法都有不可替代的使用场景
- **优雅即简约** - 自动序列化让代码更简洁，无需手动处理 JSON
- **性能即艺术** - Pipeline 批量操作体现性能与优雅的平衡
- **类型安全即契约** - 泛型推导保障编译时类型检查
- **错误处理如为人处世的哲学** - 明确的错误信息引导开发者

## 技术架构

| 层级 | 技术 | 版本 |
|------|------|------|
| **Redis 客户端** | ioredis | ^5.8.1 |
| **依赖注入** | @sker/core | workspace |
| **TypeScript** | typescript | 5.9.2 |
| **构建工具** | tsup | ^8.4.0 |
| **目标运行时** | Node.js | 18+ |
| **模块格式** | ESM + CJS | 双格式输出 |

## 依赖关系

```
@sker/redis
    ↓
    ├── @sker/core (依赖注入框架)
    │   └── 提供 @Injectable, @Inject 装饰器
    │
    └── ioredis (Redis 客户端库)
        └── 提供原生 Redis 通信

使用方：
    ├── @sker/api (NestJS 应用)
    │   └── 通过 CacheService 使用
    │
    └── @sker/workflow-run (工作流引擎)
        └── 直接注入 RedisClient
```

## 许可证

Private（内部使用）

## 贡献

这是 Sker 项目的内部包，欢迎团队成员贡献代码。

---

**代码即文档，简约即优雅。**
