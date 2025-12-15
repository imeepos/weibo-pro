# @sker/entities

TypeORM 实体定义层，包含所有数据库表结构、订阅者和查询构建器。

## 目录结构

```
src/
├── decorator.ts                              # 自定义实体装饰器
├── weibo-*.entity.ts                         # 微博相关实体（8个）
│   ├── weibo-user.entity.ts                  # 微博用户
│   ├── weibo-user-category.entity.ts         # 用户分类
│   ├── weibo-user-category-relation.entity.ts # 用户分类关系
│   ├── weibo-post.entity.ts                  # 微博帖子
│   ├── weibo-post-snapshot.entity.ts         # 帖子快照
│   ├── weibo-comment.entity.ts               # 评论
│   ├── weibo-like.entity.ts                  # 点赞
│   ├── weibo-repost.entity.ts                # 转发
│   └── weibo-account.entity.ts               # 账号
├── weibo-post.subscriber.ts                  # 帖子订阅器（自动创建快照）
├── event-*.entity.ts                         # 舆情事件实体（5个）
│   ├── event.entity.ts                       # 事件主表
│   ├── event-category.entity.ts              # 事件分类
│   ├── event-tag.entity.ts                   # 事件标签
│   ├── event-tag-relation.entity.ts          # 事件标签关系
│   └── event-statistics.entity.ts            # 事件统计
├── workflow-*.entity.ts                      # 工作流实体（4个）
│   ├── workflow.entity.ts                    # 工作流定义
│   ├── workflow-schedule.entity.ts           # 工作流调度
│   ├── workflow-run.entity.ts                # 工作流运行记录
│   └── workflow-run-log.entity.ts            # 工作流运行日志
├── llm-*.ts                                  # LLM 相关实体（4个）
│   ├── llm-provider.ts                       # LLM 提供商
│   ├── llm-model.ts                          # LLM 模型
│   ├── llm-model-provider.ts                 # 模型-提供商关系
│   └── llm-chat-log.ts                       # 聊天日志
├── prompt-*.entity.ts                        # Prompt 管理实体（3个）
│   ├── prompt-role.entity.ts                 # Prompt 角色
│   ├── prompt-skill.entity.ts                # Prompt 技能
│   └── prompt-role-skill-ref.entity.ts       # 角色-技能关系
├── memory-*.entity.ts                        # 记忆系统实体（3个）
│   ├── memory.entity.ts                      # 记忆节点
│   ├── memory-relation.entity.ts             # 记忆关系
│   └── memory-closure.entity.ts              # 记忆闭包（传递关系）
├── persona.entity.ts                         # AI 人格
├── post-nlp-result.entity.ts                 # NLP 分析结果
├── layout-configuration.entity.ts            # 布局配置
├── user-relation.view.ts                     # 用户关系视图
├── queries/                                  # 查询构建器
│   ├── event.queries.ts                      # 事件查询
│   ├── weibo-post.queries.ts                 # 帖子查询
│   ├── weibo-comment.queries.ts              # 评论查询
│   ├── weibo-user.queries.ts                 # 用户查询
│   └── index.ts
├── seeds/                                    # 种子数据
│   ├── nuwa.seed.ts                          # 女娲 AI 种子
│   ├── programming-assistant.seed.ts         # 编程助手种子
│   ├── content-auditor.seed.ts               # 内容审核员种子
│   ├── data-validator.seed.ts                # 数据验证员种子
│   └── index.ts
├── transformers/                             # 数据转换器
├── types/                                    # 类型定义
│   └── sentiment.ts                          # 情感类型
├── utils/                                    # 工具函数
└── index.ts                                  # 统一导出
```

## 核心实体分类

### 1. 微博数据实体（8个）

#### WeiboUserEntity - 微博用户

**文件**: `packages/entities/src/weibo-user.entity.ts`

```typescript
@Entity()
export class WeiboUserEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string;                    // 用户ID

  @Column()
  screen_name: string;           // 昵称

  @Column({ nullable: true })
  description: string;           // 简介

  @Column()
  followers_count: number;       // 粉丝数

  @Column()
  friends_count: number;         // 关注数

  @Column()
  statuses_count: number;        // 微博数

  @Column({ type: 'jsonb', nullable: true })
  icon_list: any[];              // 徽章列表

  @Column({ default: false })
  verified: boolean;             // 是否认证

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### WeiboPostEntity - 微博帖子

**文件**: `packages/entities/src/weibo-post.entity.ts`

```typescript
@Entity()
@Index(['created_at'])
@Index(['user_id'])
export class WeiboPostEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string;                    // 帖子ID

  @Column({ type: 'bigint' })
  user_id: string;               // 用户ID

  @Column({ type: 'text' })
  text: string;                  // 内容

  @Column({ type: 'text', nullable: true })
  text_raw: string;              // 原始内容

  @Column()
  reposts_count: number;         // 转发数

  @Column()
  comments_count: number;        // 评论数

  @Column()
  attitudes_count: number;       // 点赞数

  @Column({ type: 'jsonb', nullable: true })
  pic_infos: any;                // 图片信息

  @Column({ type: 'jsonb', nullable: true })
  user: any;                     // 用户信息（冗余）

  @Column({ type: 'timestamp' })
  created_at_weibo: Date;        // 微博创建时间

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

**关联实体**：
- `WeiboPostSnapshotEntity` - 帖子快照（历史版本）
- `WeiboCommentEntity` - 评论
- `WeiboLikeEntity` - 点赞
- `WeiboRepostEntity` - 转发

#### WeiboPostSubscriber - 帖子订阅器

**文件**: `packages/entities/src/weibo-post.subscriber.ts:19`

```typescript
@EventSubscriber()
export class WeiboPostSubscriber implements EntitySubscriberInterface<WeiboPostEntity> {
  listenTo() {
    return WeiboPostEntity;
  }

  // 自动在插入/更新时创建快照
  async afterInsert(event: InsertEvent<WeiboPostEntity>) {
    await this.createSnapshot(event.entity, event.manager);
  }

  async afterUpdate(event: UpdateEvent<WeiboPostEntity>) {
    await this.createSnapshot(event.entity, event.manager);
  }
}
```

**作用**：无需修改代码，自动为每次帖子变更创建快照，用于追踪数据变化历史。

### 2. 舆情事件实体（5个）

#### EventEntity - 舆情事件

**文件**: `packages/entities/src/event.entity.ts`

```typescript
@Entity()
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;                 // 事件标题

  @Column({ type: 'text' })
  description: string;           // 事件描述

  @Column({ type: 'simple-array' })
  keywords: string[];            // 关键词

  @Column({ type: 'timestamp' })
  start_time: Date;              // 开始时间

  @Column({ type: 'timestamp', nullable: true })
  end_time: Date;                // 结束时间

  @Column({ type: 'enum', enum: ['monitoring', 'closed'] })
  status: string;                // 状态

  @Column({ default: 0 })
  severity: number;              // 严重程度 (0-100)

  @Column({ type: 'jsonb', nullable: true })
  milestones: any[];             // 关键节点

  // 关联的微博帖子（通过关键词匹配）
  related_posts: WeiboPostEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### EventStatisticsEntity - 事件统计

**文件**: `packages/entities/src/event-statistics.entity.ts`

```typescript
@Entity()
export class EventStatisticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  event_id: string;              // 关联事件

  @Column({ type: 'date' })
  date: Date;                    // 统计日期

  @Column({ default: 0 })
  post_count: number;            // 帖子数

  @Column({ default: 0 })
  comment_count: number;         // 评论数

  @Column({ default: 0 })
  repost_count: number;          // 转发数

  @Column({ type: 'jsonb', nullable: true })
  sentiment_distribution: {      // 情感分布
    positive: number;
    neutral: number;
    negative: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  hot_topics: string[];          // 热门话题

  @CreateDateColumn()
  created_at: Date;
}
```

**关联实体**：
- `EventCategoryEntity` - 事件分类
- `EventTagEntity` - 事件标签
- `EventTagRelationEntity` - 标签关系

### 3. 工作流实体（4个）

#### WorkflowEntity - 工作流定义

**文件**: `packages/entities/src/workflow.entity.ts`

```typescript
@Entity()
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;                  // 工作流名称

  @Column({ type: 'text', nullable: true })
  description: string;           // 描述

  @Column({ type: 'jsonb' })
  graph: any;                    // 工作流图（AST）

  @Column({ default: false })
  is_active: boolean;            // 是否启用

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### WorkflowRunEntity - 工作流运行记录

**文件**: `packages/entities/src/workflow-run.entity.ts`

```typescript
@Entity()
export class WorkflowRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflow_id: string;           // 关联工作流

  @Column({ type: 'enum', enum: ['running', 'success', 'failed', 'cancelled'] })
  status: string;                // 运行状态

  @Column({ type: 'jsonb', nullable: true })
  input: any;                    // 输入参数

  @Column({ type: 'jsonb', nullable: true })
  output: any;                   // 输出结果

  @Column({ type: 'timestamp' })
  started_at: Date;              // 开始时间

  @Column({ type: 'timestamp', nullable: true })
  finished_at: Date;             // 结束时间

  @Column({ type: 'text', nullable: true })
  error: string;                 // 错误信息

  @CreateDateColumn()
  created_at: Date;
}
```

**关联实体**：
- `WorkflowScheduleEntity` - 定时调度配置
- `WorkflowRunLogEntity` - 运行日志（节点级）

### 4. NLP 相关实体

#### PostNLPResultEntity - NLP 分析结果

**文件**: `packages/entities/src/post-nlp-result.entity.ts`

```typescript
@Entity()
@Index(['post_id'], { unique: true })
export class PostNLPResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  post_id: string;               // 关联帖子

  @Column({ type: 'enum', enum: ['positive', 'neutral', 'negative'] })
  sentiment: string;             // 情感倾向

  @Column({ type: 'float' })
  sentiment_score: number;       // 情感分数 (-1 到 1)

  @Column({ type: 'simple-array' })
  keywords: string[];            // 提取的关键词

  @Column({ type: 'jsonb', nullable: true })
  entities: any;                 // 命名实体识别结果

  @Column({ type: 'jsonb', nullable: true })
  topics: string[];              // 话题标签

  @CreateDateColumn()
  created_at: Date;
}
```

### 5. LLM 相关实体（4个）

#### LLMProviderEntity - LLM 提供商

**文件**: `packages/entities/src/llm-provider.ts`

```typescript
@Entity()
export class LLMProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;                  // 提供商名称（openai, anthropic, etc）

  @Column({ type: 'text', nullable: true })
  base_url: string;              // API 基础 URL

  @Column({ type: 'jsonb', nullable: true })
  config: any;                   // 配置参数

  @CreateDateColumn()
  created_at: Date;
}
```

#### LLMModelEntity - LLM 模型

```typescript
@Entity()
export class LLMModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;                  // 模型名称（gpt-4, claude-3, etc）

  @Column({ type: 'uuid' })
  provider_id: string;           // 关联提供商

  @Column({ default: 4096 })
  max_tokens: number;            // 最大 token 数

  @Column({ type: 'float', default: 0.0 })
  input_price: number;           // 输入价格（每千 token）

  @Column({ type: 'float', default: 0.0 })
  output_price: number;          // 输出价格（每千 token）
}
```

**关联实体**：
- `LLMModelProviderEntity` - 模型-提供商关系
- `LLMChatLogEntity` - 聊天日志

### 6. Prompt 管理实体（3个）

#### PromptRoleEntity - Prompt 角色

**文件**: `packages/entities/src/prompt-role.entity.ts`

```typescript
@Entity()
export class PromptRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;                  // 角色名称

  @Column({ type: 'text' })
  system_prompt: string;         // 系统提示词

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;                 // 元数据

  @CreateDateColumn()
  created_at: Date;
}
```

**关联实体**：
- `PromptSkillEntity` - Prompt 技能
- `PromptRoleSkillRefEntity` - 角色-技能关系

### 7. 记忆系统实体（3个）

#### MemoryEntity - 记忆节点

**文件**: `packages/entities/src/memory.entity.ts`

```typescript
@Entity()
export class MemoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;               // 记忆内容

  @Column({ type: 'enum', enum: ['observation', 'reflection', 'action'] })
  type: string;                  // 记忆类型

  @Column({ type: 'float', default: 1.0 })
  importance: number;            // 重要性 (0-1)

  @Column({ type: 'timestamp' })
  timestamp: Date;               // 时间戳

  @Column({ type: 'uuid', nullable: true })
  persona_id: string;            // 关联人格

  @CreateDateColumn()
  created_at: Date;
}
```

**关联实体**：
- `MemoryRelationEntity` - 记忆关系（图结构）
- `MemoryClosureEntity` - 记忆闭包（传递关系，用于快速查询）

### 8. 其他实体

#### PersonaEntity - AI 人格

**文件**: `packages/entities/src/persona.entity.ts`

AI 代理的人格配置，包含系统提示词、目标、记忆等。

#### LayoutConfigurationEntity - 布局配置

**文件**: `packages/entities/src/layout-configuration.entity.ts`

UI 布局配置，用于保存用户的界面布局偏好。

#### UserRelationView - 用户关系视图

**文件**: `packages/entities/src/user-relation.view.ts`

数据库视图，用于查询用户关系网络。

## 查询构建器（queries/）

### EventQueries - 事件查询

**文件**: `packages/entities/src/queries/event.queries.ts`

```typescript
export class EventQueries {
  // 查询活跃事件
  static findActiveEvents(manager: EntityManager) {
    return manager.find(EventEntity, {
      where: { status: 'monitoring' },
      order: { severity: 'DESC' }
    });
  }

  // 查询事件时间线
  static findEventTimeline(manager: EntityManager, eventId: string) {
    // ...
  }
}
```

### WeiboPostQueries - 帖子查询

**文件**: `packages/entities/src/queries/weibo-post.queries.ts`

```typescript
export class WeiboPostQueries {
  // 按关键词查询帖子
  static findByKeywords(manager: EntityManager, keywords: string[]) {
    // ...
  }

  // 查询热门帖子
  static findHotPosts(manager: EntityManager, limit: number = 20) {
    return manager
      .createQueryBuilder(WeiboPostEntity, 'post')
      .orderBy('post.attitudes_count + post.reposts_count', 'DESC')
      .limit(limit)
      .getMany();
  }
}
```

**其他查询类**：
- `WeiboCommentQueries`
- `WeiboUserQueries`

## 种子数据（seeds/）

**文件**: `packages/entities/src/seeds/`

预定义的 AI 角色种子数据：

- `nuwa.seed.ts` - 女娲 AI（通用助手）
- `programming-assistant.seed.ts` - 编程助手
- `content-auditor.seed.ts` - 内容审核员
- `data-validator.seed.ts` - 数据验证员

用于初始化系统默认角色。

## 自定义装饰器

### @Entity() 装饰器

**文件**: `packages/entities/src/decorator.ts`

对 TypeORM `@Entity()` 的封装，添加项目特定功能。

## 数据转换器（transformers/）

TypeORM 列转换器，用于特殊数据类型的序列化/反序列化。

## 类型定义（types/）

### Sentiment Type

**文件**: `packages/entities/src/types/sentiment.ts`

```typescript
export type Sentiment = 'positive' | 'neutral' | 'negative';
```

## 工具函数（utils/）

实体相关的工具函数。

## 使用示例

### 基础 CRUD

```typescript
import { DataSource, EntityManager } from '@sker/entities';
import { WeiboPostEntity, EventEntity } from '@sker/entities';

// 获取 EntityManager
const manager = dataSource.manager;

// 查询帖子
const posts = await manager.find(WeiboPostEntity, {
  where: { user_id: '123456' },
  order: { created_at: 'DESC' },
  take: 10
});

// 创建事件
const event = manager.create(EventEntity, {
  title: '突发事件',
  description: '...',
  keywords: ['关键词1', '关键词2'],
  start_time: new Date(),
  status: 'monitoring',
  severity: 80
});
await manager.save(event);
```

### 使用查询构建器

```typescript
import { WeiboPostQueries, EventQueries } from '@sker/entities';

// 查询热门帖子
const hotPosts = await WeiboPostQueries.findHotPosts(manager, 20);

// 查询活跃事件
const activeEvents = await EventQueries.findActiveEvents(manager);
```

### 使用订阅器

订阅器会自动执行，无需手动调用：

```typescript
// 插入帖子后，WeiboPostSubscriber 会自动创建快照
const post = manager.create(WeiboPostEntity, { /* ... */ });
await manager.save(post);
// ↑ 自动触发 WeiboPostSubscriber.afterInsert()
```

### 初始化 DataSource

```typescript
import { DataSource } from '@sker/entities';
import { WeiboPostEntity, EventEntity } from '@sker/entities';
import { WeiboPostSubscriber } from '@sker/entities';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'weibo_pro',
  entities: [
    WeiboPostEntity,
    EventEntity,
    // ... 其他实体
  ],
  subscribers: [WeiboPostSubscriber],
  synchronize: false, // 生产环境禁用
  logging: true
});

await dataSource.initialize();
```

## 设计模式

1. **Active Record vs Data Mapper**: 使用 Data Mapper 模式（EntityManager）
2. **Repository Pattern**: 通过查询类（Queries）实现
3. **Observer Pattern**: EntitySubscriber 实现自动化操作
4. **Strategy Pattern**: 多种查询策略
5. **Factory Pattern**: 实体创建使用 manager.create()

## 最佳实践

1. **索引优化**: 为常用查询字段添加 `@Index()`
2. **软删除**: 使用 `@DeleteDateColumn()` 实现软删除
3. **时间戳**: 统一使用 `@CreateDateColumn()` 和 `@UpdateDateColumn()`
4. **JSON 类型**: 复杂结构使用 `type: 'jsonb'`（PostgreSQL）
5. **枚举类型**: 使用 TypeScript enum + `type: 'enum'`
6. **关系查询**: 优先使用 QueryBuilder 避免 N+1 问题
7. **事务**: 关键操作使用 `manager.transaction()`
8. **订阅器**: 自动化逻辑放在订阅器中（如快照创建）

## 注意事项

1. **ID 类型**: 微博相关使用 `bigint`，内部生成使用 `uuid`
2. **时区**: 所有时间戳使用 UTC
3. **冗余字段**: 必要时允许冗余（如 WeiboPostEntity.user）
4. **快照机制**: 帖子变更自动创建快照，追踪历史
5. **闭包表**: 记忆系统使用闭包表优化传递关系查询
