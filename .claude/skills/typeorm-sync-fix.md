---
name: typeorm-concurrent-sync-fix
description: TypeORM 并发 synchronize 冲突的简单解决方案。当多个应用同时启动时出现 "duplicate key value violates unique constraint pg_type_typname_nsp_index" 错误。
---

# TypeORM 并发 Synchronize 冲突 - 简单解决方案

## 问题诊断

### 错误特征

```
QueryFailedError: duplicate key value violates unique constraint "pg_type_typname_nsp_index"
Key (typname, typnamespace)=(event_categories, 2200) already exists.
```

### ❌ 常见误解

- ~~这是外键冲突~~ → 不是！
- ~~这是数据库残留问题~~ → 只是表象！
- ~~清理数据库就能解决~~ → 治标不治本！

### ✅ 真正原因

**多个应用并发执行 synchronize**：

```bash
pnpm dev --concurrency=23
  ↓
@sker/api      ──┐
@sker/crawler  ──┤
@sker/app      ──┼──> 同时执行 synchronize: true
@sker/bigscreen──┤
@sker/storybook──┘
  ↓
竞态条件：同时 CREATE TABLE → 类型名冲突
```

### 时间线

```
t1: api      → CREATE TABLE event_categories (✅ 成功，创建类型)
t2: crawler  → CREATE TABLE event_categories (❌ 类型已存在！)
t3: app      → CREATE TABLE event_categories (❌ 类型已存在！)
```

## 简单解决方案：只让 API 同步

### 原理

- ✅ 只有 @sker/api 执行 `synchronize: true`
- ✅ 其他应用都是 `synchronize: false`
- ✅ 所有应用共享同一个 schema

### 实现步骤

#### 1. 修改 packages/entities/src/utils.ts

```typescript
export const createDatabaseConfig = (): DataSourceOptions => {
  const databaseUrl = process.env.DATABASE_URL;
  const entities = [...new Set(root.get(ENTITY, []))]

  // 只允许显式开启 synchronize 的应用执行表同步
  const shouldSync = process.env.TYPEORM_SYNCHRONIZE === 'true';

  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      subscribers: [WeiboPostSubscriber],
      synchronize: shouldSync, // ← 从环境变量控制
      // ... 其他配置
    };
  }
  throw new Error(`not found DATABASE_URL`)
};
```

#### 2. 修改 apps/api/package.json

```json
{
  "scripts": {
    "dev": "cross-env TYPEORM_SYNCHRONIZE=true tsx watch src/main.ts"
  }
}
```

#### 3. 安装 cross-env

```bash
pnpm add -D cross-env --filter=@sker/api
```

### 执行效果

```bash
pnpm dev
  ↓
[api]       🔄 initialized in 2345ms with sync
[crawler]   📌 initialized in 567ms without sync
[app]       📌 initialized in 589ms without sync
[bigscreen] 📌 initialized in 612ms without sync
```

## 为什么这样设计？

| 方案 | 优点 | 缺点 |
|------|------|------|
| **只让 API 同步** | ✅ 简单直接<br>✅ 无需额外依赖<br>✅ 0 复杂度 | - |
| Advisory Lock | ❌ 过度设计<br>❌ 复杂度高 | 分布式场景 |
| Migration | ✅ 生产级 | 开发体验差 |

## 启动顺序问题？

**不存在**！原因：

1. TypeORM synchronize 是**幂等**的（多次执行结果相同）
2. 即使 crawler 先启动，也只是**读取** schema，不会修改
3. API 启动后执行 synchronize，其他应用自动看到更新

## 验证方法

```bash
# 1. 完全清理数据库
npx tsx scripts/rebuild-db.ts

# 2. 启动所有服务
pnpm dev

# 3. 检查日志
# 应该只有 @sker/api 显示 "with sync"
# 其他应用显示 "without sync"
```

## 开发 vs 生产

### 开发环境

```bash
# API 使用 synchronize
TYPEORM_SYNCHRONIZE=true

# 其他应用不设置（默认 false）
```

### 生产环境

```bash
# 所有应用都不使用 synchronize
TYPEORM_SYNCHRONIZE=false

# 使用 Migration
typeorm migration:run
```

## 总结

### 问题本质

并发 synchronize → 竞态条件 → 类型名冲突

### 解决方案

只让 API 执行 synchronize → 避免并发 → 问题消失

### 核心思想

**最简单的方案就是最好的方案** - 不要过度设计！
