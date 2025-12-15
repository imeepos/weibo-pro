# @sker/redis - Redis 客户端封装

企业级 Redis 客户端包装，提供类型安全的数据操作和依赖注入支持。

---

## 核心理念

**存在即合理**
- 每个 API 方法都有不可替代的使用场景
- RedisClient 提供完整的 Redis 数据结构操作
- RedisPipeline 通过批量操作提升性能
- 自动序列化机制消除手动 JSON 处理

**优雅即简约**
- 自动处理 JSON 序列化/反序列化
- 泛型类型推导保障类型安全
- 链式 API 让批量操作更优雅
- 与 @sker/core 深度集成，开箱即用

**性能即艺术**
- Pipeline 批量操作减少网络往返
- 智能缓存管理优化内存使用
- 类型安全避免运行时错误

---

## 目录结构

```
packages/redis/
├── src/
│   └── index.ts                 # 核心实现（单文件架构）
├── dist/                        # 构建输出（ESM + CJS）
├── package.json                 # 包配置
├── tsconfig.json                # TypeScript 配置
├── tsup.config.ts               # 构建配置
└── README.md                    # 使用文档
```

**设计哲学**：单文件架构，所有核心功能聚焦在 277 行代码中。代码即文档，简约即优雅。

---

## 核心类和函数

### 1. RedisClient - 企业级客户端

**文件**: `C:\Users\imeep\Desktop\shopify\weibo-pro\packages\redis\src\index.ts` (L64-L268)

#### 类装饰器配置
```typescript
// 行 58-63: 依赖注入配置
@Injectable({
    useFactory: () => {
        return new RedisClient(new Redis(redisConfigFactory()))
    },
    deps: []
})
```

**存在即合理**：通过工厂函数注册到 @sker/core 根注入器，全局单例模式保证连接复用。

#### 构造函数
```typescript
// 行 65: 接受 ioredis 客户端实例
constructor(private client: Redis) { }
```

**优雅设计**：封装 ioredis 原生客户端，提供统一的类型安全接口。

---

### 字符串操作 (String Operations)

#### get<T>(key: string)
**位置**: L67-L75
**返回**: `Promise<T | null>`

```typescript
async get<T = string>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
        return JSON.parse(value) as T;  // 尝试解析 JSON
    } catch {
        return value as T;              // 失败则返回原始值
    }
}
```

**自动序列化机制**：
1. 优先尝试 JSON.parse() 解析对象
2. 解析失败返回原始字符串
3. 泛型类型推导保障类型安全

**使用示例**：
```typescript
const str = await redis.get<string>('key');           // 字符串
const obj = await redis.get<UserProfile>('user:1');   // 对象
const num = await redis.get<number>('counter');       // 数字
```

#### set(key, value, ttl?)
**位置**: L77-L84
**参数**: `key: string, value: any, ttl?: number`

```typescript
async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
        await this.client.setex(key, ttl, serialized);
    } else {
        await this.client.set(key, serialized);
    }
}
```

**设计亮点**：
- 自动 JSON 序列化非字符串值
- 可选 TTL 参数（秒）
- 内部智能调用 `set` 或 `setex`

#### setex(key, seconds, value)
**位置**: L86-L89
**用途**: 显式设置带过期时间的值

#### setnx(key, value)
**位置**: L91-L94
**返回**: `Promise<number>` (1=成功, 0=已存在)
**用途**: 分布式锁的基础操作

---

### 有序集合操作 (Sorted Set Operations)

#### zadd(key, score, member)
**位置**: L110-L112
**用途**: 添加成员到有序集合

```typescript
await redis.zadd('leaderboard', 100, 'user:1');
```

#### zincrby(key, increment, member)
**位置**: L114-L117
**返回**: `Promise<number>` (新分数)
**用途**: 原子性增加分数（排行榜场景）

```typescript
// 用户得分+50
const newScore = await redis.zincrby('leaderboard', 50, 'user:1');
```

#### zscore(key, member)
**位置**: L119-L126
**返回**: `Promise<number | null>`

**优雅设计**：自动处理 ioredis 返回的字符串，转换为数字类型。

```typescript
const score = await redis.zscore('leaderboard', 'user:1');
// 内部逻辑：parseFloat(result) 并处理 NaN
```

#### zrangebyscore(key, min, max, withScores?)
**位置**: L128-L143
**用途**: 按分数范围查询

```typescript
// 查询分数 100-500 之间的用户
const users = await redis.zrangebyscore('leaderboard', 100, 500);

// 同时返回分数
const withScores = await redis.zrangebyscore('leaderboard', 100, 500, true);
// ['user1', '150', 'user2', '200']
```

**错误处理**：返回空数组而非抛出异常（优雅降级）

#### zrange / zrevrange(key, start, stop, withScores?)
**位置**: L149-L171
**用途**: 按排名范围查询

```typescript
const top10 = await redis.zrevrange('leaderboard', 0, 9);    // 前10名（降序）
const bottom10 = await redis.zrange('leaderboard', 0, 9);    // 后10名（升序）
```

#### zpopmax(key)
**位置**: L177-L189
**返回**: `Promise<{ member: string; score: number } | null>`

**设计亮点**：封装 ioredis 返回的数组为对象，类型更清晰。

```typescript
const winner = await redis.zpopmax('leaderboard');
// { member: 'user:1', score: 200 }
```

#### 其他有序集合方法
- **zcard**: L173-L175 - 获取集合大小
- **zrem**: L191-L193 - 删除成员
- **zremrangebyscore**: L145-L147 - 按分数范围删除

---

### 哈希操作 (Hash Operations)

#### hmset(key, data)
**位置**: L196-L198
**用途**: 批量设置哈希字段

```typescript
await redis.hmset('user:1', {
    name: 'Alice',
    age: 25,
    email: 'alice@example.com'
});
```

#### hset(key, field, value)
**位置**: L200-L203
**自动序列化**: 对象自动转 JSON

```typescript
await redis.hset('user:1', 'profile', { bio: 'Developer', city: 'Beijing' });
```

#### hget<T>(key, field)
**位置**: L205-L213
**返回**: `Promise<T | null>`

**泛型类型推导**：
```typescript
const name = await redis.hget<string>('user:1', 'name');
const profile = await redis.hget<UserProfile>('user:1', 'profile');
```

#### hgetall(key)
**位置**: L215-L217
**返回**: `Promise<Record<string, string>>`

**注意**：返回值都是字符串，需要手动 JSON.parse() 对象字段。

#### hdel(key, ...fields)
**位置**: L219-L221
**用途**: 删除一个或多个字段

```typescript
await redis.hdel('user:1', 'email', 'phone');
```

---

### 集合操作 (Set Operations)

#### sadd(key, ...members)
**位置**: L233-L235
**用途**: 添加成员（自动去重）

```typescript
await redis.sadd('tags:post:1', 'javascript', 'redis', 'typescript');
```

#### sismember(key, member)
**位置**: L237-L240
**返回**: `Promise<boolean>`

**优雅设计**：将 ioredis 返回的 0/1 转换为布尔值。

```typescript
const exists = await redis.sismember('tags:post:1', 'redis');  // true
```

#### 其他集合方法
- **srem**: L242-L244 - 删除成员
- **scard**: L246-L248 - 获取集合大小
- **smembers**: L250-L252 - 获取所有成员

---

### 键操作 (Key Operations)

#### del(key)
**位置**: L96-L98
**用途**: 删除键

#### exists(key)
**位置**: L100-L103
**返回**: `Promise<boolean>`

```typescript
const exists = await redis.exists('user:1');  // true/false
```

#### expire(key, seconds)
**位置**: L224-L226
**用途**: 设置过期时间

```typescript
await redis.expire('session:abc123', 3600);  // 1小时后过期
```

#### ttl(key)
**位置**: L228-L230
**返回**: 剩余秒数（-1=永久，-2=不存在）

#### keys(pattern)
**位置**: L260-L262
**警告**: 生产环境慎用（阻塞命令）

```typescript
const userKeys = await redis.keys('user:*');
```

#### close()
**位置**: L105-L107
**用途**: 关闭连接（应用退出时调用）

---

### 列表操作 (List Operations)

#### lpush(key, ...elements)
**位置**: L255-L257
**用途**: 从头部插入元素

```typescript
await redis.lpush('notifications', 'msg1', 'msg2', 'msg3');
```

**设计简约**：当前仅实现 lpush，按需扩展（存在即合理）。

---

### 2. RedisPipeline - 批量操作

**文件**: `C:\Users\imeep\Desktop\shopify\weibo-pro\packages\redis\src\index.ts` (L4-L55)

#### 核心设计

```typescript
// 行 5: 封装 ioredis 的 ChainableCommander
constructor(private pipeline: ChainableCommander) { }
```

**性能即艺术**：Pipeline 将多个命令打包成一次网络往返，显著提升性能。

#### 创建 Pipeline

```typescript
// 行 265-267: RedisClient.pipeline()
pipeline(): RedisPipeline {
    return new RedisPipeline(this.client.pipeline());
}
```

#### 链式 API

**set(key, value, ttl?)**: L12-L19
```typescript
set(key: string, value: string, ttl?: number): RedisPipeline {
    if (ttl) {
        this.pipeline.setex(key, ttl, value);
    } else {
        this.pipeline.set(key, value);
    }
    return this;  // 支持链式调用
}
```

**其他方法**:
- **get**: L7-L10
- **del**: L21-L24
- **zadd**: L31-L34
- **zincrby**: L26-L29
- **expire**: L36-L39
- **hmset**: L41-L44
- **hset**: L46-L50

#### 执行 Pipeline

```typescript
// 行 52-54
async exec(): Promise<[Error | null, any][] | null> {
    return await this.pipeline.exec();
}
```

**返回值**: 数组，每个元素对应一个命令的 `[错误, 结果]` 元组。

#### 使用示例

```typescript
const pipeline = redis.pipeline();

pipeline
    .set('user:1:name', 'Alice')
    .set('user:1:age', '25', 3600)
    .zadd('active_users', Date.now(), 'user:1')
    .expire('user:1:age', 3600);

const results = await pipeline.exec();

// 检查结果
results?.forEach(([err, result], index) => {
    if (err) {
        console.error(`命令 ${index} 失败:`, err);
    }
});
```

**性能对比**:
```typescript
// ❌ 慢: 100次网络往返
for (let i = 0; i < 100; i++) {
    await redis.set(`key:${i}`, `value:${i}`);
}

// ✅ 快: 仅1次网络往返
const pipeline = redis.pipeline();
for (let i = 0; i < 100; i++) {
    pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
```

---

### 3. redisConfigFactory - 配置工厂

**文件**: `C:\Users\imeep\Desktop\shopify\weibo-pro\packages\redis\src\index.ts` (L270-L276)

```typescript
export const redisConfigFactory = (): string => {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        return redisUrl;
    }
    throw new Error(`REDIS_URL NOT FOUND`)
};
```

**存在即合理**：
- 从环境变量 `REDIS_URL` 读取连接字符串
- 找不到配置时快速失败（Fail Fast）
- 支持标准 Redis URL 格式

**环境变量格式**:
```bash
REDIS_URL=redis://localhost:6379/0
REDIS_URL=redis://:password@localhost:6379/1
REDIS_URL=rediss://user:password@redis.example.com:6380/2
```

---

## 使用示例

### 1. 缓存服务 (CacheService)

**文件**: `C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\src\services\cache.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class CacheService {
    constructor(
        @Inject(RedisClient) private readonly redis: RedisClient
    ) {}

    // 获取缓存，不存在则执行 factory 并缓存
    async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        ttl: number = 300  // 默认 5 分钟
    ): Promise<T> {
        const cached = await this.redis.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        const data = await factory();
        await this.redis.setex(key, ttl, data);

        return data;
    }

    // 批量删除缓存 (按模式)
    async delPattern(pattern: string): Promise<void> {
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            await this.redis.del(key);
        }
    }

    // 生成缓存键
    static buildKey(prefix: string, ...parts: (string | number)[]): string {
        return [prefix, ...parts].join(':');
    }
}
```

**缓存键命名规范**:
```typescript
export const CACHE_KEYS = {
    OVERVIEW_STATS: 'overview:stats',
    HOT_EVENTS: 'events:hot',
    HOT_POSTS: 'posts:hot',
    EVENT_DETAIL: 'events:detail',
    // ... 共 30+ 个预定义键
} as const;

export const CACHE_TTL = {
    SHORT: 60,        // 1 分钟 - 实时性要求高
    MEDIUM: 300,      // 5 分钟 - 中等实时性
    LONG: 1800,       // 30 分钟 - 实时性要求低
    VERY_LONG: 3600   // 1 小时 - 基础数据
} as const;
```

**使用示例**:
```typescript
// 获取热门事件（带缓存）
const hotEvents = await cache.getOrSet(
    CACHE_KEYS.HOT_EVENTS,
    async () => await eventRepository.findHotEvents(),
    CACHE_TTL.MEDIUM
);

// 缓存失效
await cache.delPattern('events:*');
```

---

### 2. 增量帖子检测 (IncrementalPostDetector)

**文件**: `C:\Users\imeep\Desktop\shopify\weibo-pro\packages\workflow-run\src\services\IncrementalPostDetector.ts`

```typescript
@Injectable()
export class IncrementalPostDetector {
    private readonly lastProcessedTimeKey = 'weibo:monitor:last_processed_time';
    private readonly processedPostsCache = new Set<string>();
    private readonly maxCacheSize = 1000;

    constructor(private readonly redis: RedisClient) {}

    // 检测新帖子
    async detectNewPosts(posts: any[]): Promise<any[]> {
        if (posts.length === 0) {
            return [];
        }

        const lastProcessedTime = await this.getLastProcessedTime();
        const newPosts: any[] = [];

        for (const post of posts) {
            if (await this.isNewPost(post, lastProcessedTime)) {
                newPosts.push(post);
            }
        }

        // 更新最后处理时间
        if (newPosts.length > 0) {
            const latestTime = this.getLatestPostTime(newPosts);
            await this.updateLastProcessedTime(latestTime);
        }

        return newPosts;
    }

    // 获取最后处理时间
    private async getLastProcessedTime(): Promise<Date> {
        try {
            const timestampStr = await this.redis.get(this.lastProcessedTimeKey);

            if (timestampStr) {
                const timestamp = Number(timestampStr);
                if (!isNaN(timestamp)) {
                    return new Date(timestamp);
                }
            }
        } catch (error) {
            console.warn('[IncrementalDetector] Redis 获取失败，使用默认时间', error);
        }

        // 默认返回1小时前的时间（优雅降级）
        return new Date(Date.now() - 60 * 60 * 1000);
    }

    // 更新最后处理时间
    private async updateLastProcessedTime(time: Date): Promise<void> {
        try {
            const timestamp = time.getTime();
            await this.redis.set(this.lastProcessedTimeKey, timestamp.toString());

            console.log(`[IncrementalDetector] 📅 更新最后处理时间: ${time.toISOString()}`);
        } catch (error) {
            console.warn('[IncrementalDetector] 更新最后处理时间失败', error);
            // 优雅降级：记录失败但不中断处理
        }
    }
}
```

**设计亮点**:
1. **双层去重**: 内存缓存 (Set) + Redis 时间戳
2. **优雅降级**: Redis 不可用时使用默认值
3. **错误隔离**: 错误不会中断主流程
4. **性能优化**: 内存缓存避免重复 Redis 查询

---

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
}
```

---

### 4. 会话管理

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

---

### 5. 速率限制 (Rate Limiting)

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

---

### 6. 实时统计

```typescript
@Injectable()
export class AnalyticsService {
    constructor(@Inject(RedisClient) private redis: RedisClient) {}

    // 记录页面访问
    async trackPageView(page: string, userId: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const pipeline = this.redis.pipeline();

        // 页面总访问量 (Sorted Set)
        pipeline.zincrby(`pv:${today}`, 1, page);

        // 独立访客 (Set 去重)
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

## 设计模式

### 1. 工厂模式 (Factory Pattern)

```typescript
// redisConfigFactory 通过环境变量创建配置
@Injectable({
    useFactory: () => {
        return new RedisClient(new Redis(redisConfigFactory()))
    },
    deps: []
})
```

**优势**:
- 配置集中管理
- 环境变量驱动
- 支持自定义配置覆盖

---

### 2. 装饰器模式 (Decorator Pattern)

RedisClient 装饰 ioredis 原生客户端，增强功能：
- 自动 JSON 序列化/反序列化
- 类型安全的泛型 API
- 统一的错误处理

---

### 3. 建造者模式 (Builder Pattern)

RedisPipeline 使用链式 API 构建批量操作：

```typescript
redis.pipeline()
    .set('key1', 'value1')
    .zadd('leaderboard', 100, 'user1')
    .expire('key1', 3600)
    .exec();
```

---

### 4. 单例模式 (Singleton Pattern)

通过 `@Injectable({ providedIn: 'root' })` 注册到根注入器，全局唯一实例：

```typescript
const redis1 = root.get(RedisClient);
const redis2 = root.get(RedisClient);
// redis1 === redis2 (同一实例)
```

---

## 最佳实践

### 1. 类型安全

```typescript
// ✅ 推荐: 明确类型
interface UserProfile {
    id: number;
    name: string;
    email: string;
}
const profile = await redis.get<UserProfile>('user:1');
// profile 的类型是 UserProfile | null

// ❌ 避免: 缺少类型
const profile = await redis.get('user:1');
// profile 的类型是 string | null
```

---

### 2. 合理设置 TTL

```typescript
// ✅ 推荐: 为缓存设置过期时间
await redis.set('cache:data', data, 300);  // 5分钟

// ❌ 避免: 永久缓存可能导致内存泄漏
await redis.set('cache:data', data);
```

---

### 3. 使用 Pipeline 批量操作

```typescript
// ✅ 推荐: 批量操作使用 Pipeline
const pipeline = redis.pipeline();
users.forEach(user => {
    pipeline.set(`user:${user.id}`, user);
});
await pipeline.exec();

// ❌ 避免: 循环中的单个操作
for (const user of users) {
    await redis.set(`user:${user.id}`, user);  // 性能差
}
```

---

### 4. 使用命名空间避免键冲突

```typescript
// ✅ 推荐: 使用前缀分组键
await redis.set('user:1:profile', profile);
await redis.set('session:abc123', sessionData);
await redis.zadd('leaderboard:daily', score, userId);

// ❌ 避免: 扁平化的键名
await redis.set('profile', profile);
await redis.set('session', sessionData);
```

---

### 5. 错误处理

```typescript
// ✅ 推荐: 处理可能的错误
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

---

### 6. 优雅关闭连接

```typescript
// 应用关闭时清理资源
process.on('SIGTERM', async () => {
    await redis.close();
    process.exit(0);
});
```

---

## 与 @sker/core 集成

### NestJS 集成示例

**文件**: `C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\src\app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RedisClient } from '@sker/redis';
import { root } from '@sker/core';

@Module({
    providers: [
        {
            provide: RedisClient,
            useFactory: () => root.get(RedisClient),  // 从根注入器获取单例
        },
    ],
})
export class AppModule {}
```

**双容器模式**:
- @sker/core 根注入器管理全局单例
- NestJS 容器作为 HTTP 层 facade
- 通过 `useFactory` 桥接两个容器

---

## 技术架构

### 依赖关系

```
@sker/redis
    ├── @sker/core (依赖注入框架)
    │   └── 提供 @Injectable, @Inject 装饰器
    │
    └── ioredis (Redis 客户端库)
        └── 提供原生 Redis 通信

使用方:
    ├── @sker/api (NestJS 应用)
    │   └── 通过 CacheService 使用
    │
    └── @sker/workflow-run (工作流引擎)
        └── 直接注入 RedisClient
```

### 构建配置

**tsup.config.ts**:
```typescript
export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],       // 双格式输出
    dts: true,                     // 生成类型声明
    clean: false,
    splitting: false,
    sourcemap: true,
    target: 'node18',
})
```

**输出文件**:
- `dist/index.js` - CommonJS 格式
- `dist/index.mjs` - ESM 格式
- `dist/index.d.ts` - TypeScript 类型声明

---

## 性能优化建议

### 1. Pipeline 批量操作

**场景**: 批量设置 1000 个键

```typescript
// 慢: 1000次网络往返 (~1000ms)
for (let i = 0; i < 1000; i++) {
    await redis.set(`key:${i}`, `value:${i}`);
}

// 快: 1次网络往返 (~10ms)
const pipeline = redis.pipeline();
for (let i = 0; i < 1000; i++) {
    pipeline.set(`key:${i}`, `value:${i}`);
}
await pipeline.exec();
```

**性能提升**: 100 倍

---

### 2. 合理的 TTL 策略

```typescript
// 实时性要求高的数据: 1分钟
await redis.set('realtime:data', data, 60);

// 中等实时性: 5分钟
await redis.set('cache:hot-posts', posts, 300);

// 基础数据: 1小时
await redis.set('cache:config', config, 3600);
```

---

### 3. 避免使用 `keys` 命令

```typescript
// ❌ 生产环境禁用: 阻塞所有操作
const keys = await redis.keys('user:*');

// ✅ 使用 SCAN 代替 (需要扩展实现)
// 或预先维护键列表 (使用 Set)
await redis.sadd('user:keys', 'user:1', 'user:2');
const keys = await redis.smembers('user:keys');
```

---

### 4. 内存缓存 + Redis 双层缓存

```typescript
class CacheService {
    private memoryCache = new Map<string, any>();  // L1缓存

    async get<T>(key: string): Promise<T | null> {
        // L1: 内存缓存
        if (this.memoryCache.has(key)) {
            return this.memoryCache.get(key);
        }

        // L2: Redis缓存
        const value = await this.redis.get<T>(key);
        if (value !== null) {
            this.memoryCache.set(key, value);
        }

        return value;
    }
}
```

---

## 环境变量配置

```bash
# .env
REDIS_URL=redis://localhost:6379/0              # 本地开发
REDIS_URL=redis://:password@localhost:6379/1    # 带密码
REDIS_URL=rediss://user:pass@redis.com:6380/2   # SSL 连接
```

**URL 格式说明**:
- `redis://` - 标准连接
- `rediss://` - SSL/TLS 连接
- `:password@` - 密码认证
- `/0` - 数据库编号 (0-15)

---

## 故障排查

### 1. 连接失败

**错误**: `Error: REDIS_URL NOT FOUND`

**解决**:
```bash
# 检查 .env 文件
cat .env | grep REDIS_URL

# 设置环境变量
export REDIS_URL=redis://localhost:6379
```

---

### 2. 序列化失败

**错误**: `JSON.parse() 解析失败`

**原因**: Redis 中存储的不是有效 JSON

**解决**:
```typescript
// 检查原始值
const raw = await redis.client.get('key');
console.log('Raw value:', raw);

// 手动解析
const value = await redis.get('key');
if (typeof value === 'string') {
    // 原始字符串
} else {
    // 对象
}
```

---

### 3. Pipeline 执行失败

**场景**: 部分命令失败

```typescript
const results = await pipeline.exec();

results?.forEach(([err, result], index) => {
    if (err) {
        console.error(`命令 ${index} 失败:`, err.message);
        // 记录失败的命令
    } else {
        console.log(`命令 ${index} 成功:`, result);
    }
});
```

**注意**: Pipeline 的原子性是「全部发送」而非「全部成功」。

---

## 扩展建议

### 1. 添加 SCAN 命令

```typescript
// src/index.ts
async scan(cursor: number, pattern: string, count: number = 10): Promise<[number, string[]]> {
    const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    return [parseInt(nextCursor), keys];
}
```

---

### 2. 添加事务支持

```typescript
// 使用 MULTI/EXEC 实现事务
async multi(): Promise<RedisTransaction> {
    return new RedisTransaction(this.client.multi());
}
```

---

### 3. 添加 Pub/Sub 支持

```typescript
async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
        if (ch === channel) callback(msg);
    });
}
```

**注意**: 当前项目使用 RabbitMQ (@sker/mq) 处理消息队列，Pub/Sub 按需添加。

---

## 总结

**代码即文档，简约即优雅**

@sker/redis 通过 277 行代码实现了企业级 Redis 客户端的所有核心功能：
- ✅ 完整的数据类型支持 (String/Hash/Set/ZSet/List)
- ✅ 自动 JSON 序列化/反序列化
- ✅ Pipeline 批量操作优化
- ✅ 依赖注入集成
- ✅ 类型安全的泛型 API
- ✅ 优雅的错误处理

**存在即合理**: 每个方法都有不可替代的使用场景
**优雅即简约**: 代码清晰易懂，无冗余设计
**性能即艺术**: Pipeline 体现性能与优雅的平衡

---

## 参考资料

- **ioredis 文档**: https://github.com/redis/ioredis
- **Redis 命令参考**: https://redis.io/commands
- **@sker/core 文档**: `C:\Users\imeep\Desktop\shopify\weibo-pro\packages\core\CLAUDE.md`
- **使用示例**: `C:\Users\imeep\Desktop\shopify\weibo-pro\apps\api\src\services\cache.service.ts`

---

**代码艺术家的作品 | 每一行代码都有其存在的意义**
