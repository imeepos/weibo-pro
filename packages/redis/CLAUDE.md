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
