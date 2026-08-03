# @sker/entities

TypeORM 实体与数据访问层，集中承载微博数据、舆情事件、工作流、LLM/Prompt、记忆系统等全部数据库表结构、查询构建器与订阅器。

## 核心职责

- **实体定义**：以 TypeORM 实体类定义全部数据库表结构（微博、事件、工作流、LLM、Prompt、记忆等）
- **查询构建器**：将复杂查询封装为可复用的函数（`queries/`）
- **数据源管理**：`useDataSource` / `useEntityManager` 封装数据源与事务
- **订阅器与派生逻辑**：`subscribers/` 自动维护快照、小时级统计、用户关系统计与工作流调度
- **种子数据**：`seeds/` 预置 AI 角色（女娲、编程助手、内容审核员、数据验证员等）
- **服务与工具**：`services/`（传播速度、事件小时统计）、`utils/`（用户分类器等）、迁移脚本 `migrations/`

## 目录结构

```
src/
├── index.ts                              # 统一导出（含 typeorm 的 DataSource/EntityManager/Repository）
├── decorator.ts                          # 自定义实体装饰器（DI 自动注册）
├── *.entity.ts                           # 实体定义（见下方分组）
├── queries/                              # 查询构建器
│   ├── event.queries.ts                  # 事件查询（findHotEvents、findEventList 等）
│   ├── weibo-post.queries.ts             # 帖子查询
│   ├── weibo-comment.queries.ts          # 评论查询
│   ├── weibo-user.queries.ts             # 用户查询
│   ├── overview-statistics.queries.ts    # 概览统计查询
│   └── index.ts
├── subscribers/                          # 订阅器 / 派生逻辑
│   ├── post-snapshot.helper.ts           # 帖子快照维护
│   ├── hourly-statistics.helper.ts       # 小时级统计
│   ├── user-relation-statistics.helper.ts# 用户关系统计
│   └── workflow-schedule.subscriber.ts   # 工作流调度订阅器
├── services/                             # 业务服务
│   ├── event-hourly-statistics.service.ts# 事件小时统计服务
│   └── propagation-velocity.service.ts   # 传播速度服务
├── transformers/                         # 数据转换器（如 boolean→smallint）
├── seeds/                                # 种子数据（AI 角色预设）
├── migrations/                           # 数据库迁移脚本
├── utils/                                # 工具（pure、user-category-classifier）
└── types/                                # 类型定义（sentiment 等）
```

### 实体分组

- **微博数据**：`WeiboUserEntity`、`WeiboPostEntity`、`WeiboCommentEntity`、`WeiboLikeEntity`、`WeiboRepostEntity`、`WeiboPostSnapshotEntity`、`WeiboAccountEntity`、`WeiboUserCategoryEntity`、`WeiboUserCategoryRelationEntity`
- **事件分析**：`EventEntity`、`EventCategoryEntity`、`EventTagEntity`、`EventTagRelationEntity`、`EventHourlyStatisticsEntity`、`OverviewStatisticsEntity`
- **工作流**：`WorkflowEntity`、`WorkflowScheduleEntity`、`WorkflowRunEntity`、`WorkflowRunLogEntity`
- **LLM**：`LlmProvider`、`LlmModel`、`LlmModelProvider`、`LlmChatLog`
- **Prompt 管理**：`PromptRoleEntity`、`PromptSkillEntity`、`PromptRoleSkillRefEntity`、`PromptVersionEntity`、`PromptOptimizationTaskEntity`
- **记忆系统**：`MemoryEntity`、`MemoryRelationEntity`、`MemoryClosureEntity`、`MemoryEvidenceEntity`、`PersonaEntity`
- **用户画像蒸馏**：`UserProfileDistillationTaskEntity`、`UserProfileSourcePostEntity`、`UserProfilePostExtractionEntity`、`WeiboUserPersonaLinkEntity`、`UserRelationStatisticsEntity`

## 数据访问

```typescript
import { useDataSource, useEntityManager, findHotEvents, findEventList } from '@sker/entities';

// 获取数据源 / 使用实体管理器
const ds = await useDataSource();
await useEntityManager(async (m) => m.find(EventEntity));

// 查询构建器
const hotEvents = await findHotEvents('today', 10);
const events = await findEventList('thisWeek', { category: '社会', search: '关键词', limit: 20 });
```

支持的时间范围：`today` / `yesterday` / `thisWeek` / `lastWeek` / `thisMonth` / `lastMonth` / `thisQuarter` / `lastQuarter` / `halfYear` / `lastHalfYear` / `thisYear` / `lastYear` / `all`。

数据库连接通过 `DATABASE_URL` 环境变量配置：

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

## 边界

- **✅ 负责**：数据库表结构与实体定义；数据访问（查询/订阅器/服务）；种子数据与迁移；为上层业务提供类型化的数据模型与查询能力
- **❌ 不负责**：不包含 API 路由与控制器（见 `@sker/sdk` / `apps/api`）；不负责 DI 容器本身（见 `@sker/core`）；不包含前端状态管理（见 `@sker/store`）
- **对外依赖**：`@sker/core`（实体 DI 自动注册）、`@sker/redis`；外部依赖 `typeorm`、`reflect-metadata`、`pg`
- **被谁依赖**：`apps/api`、`apps/bigscreen`、`apps/crawler`；`packages/agent`、`packages/crawler-core`、`packages/sdk`（dev）、`packages/workflow-ast`、`packages/workflow-run`、`packages/workflow-ui`
