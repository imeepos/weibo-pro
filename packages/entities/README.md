# @sker/entities

TypeORM 实体与数据访问层。

## 核心理念

**代码即文档** - 实体定义本身即完整的数据模型说明
**类型即契约** - TypeScript 类型系统保障数据完整性
**查询即逻辑** - 将复杂查询封装为可复用的函数

## 架构

```
src/
├── *.entity.ts          # 实体定义
├── queries/             # 查询构建器
├── transformers/        # 数据转换器
├── utils/               # 工具函数
├── types/               # 类型定义
├── decorator.ts         # 自定义装饰器
└── utils.ts            # 数据源管理
```

## 实体模型

### 微博数据
- `WeiboUserEntity` - 用户信息
- `WeiboPostEntity` - 微博内容
- `WeiboCommentEntity` - 评论
- `WeiboLikeEntity` - 点赞
- `WeiboRepostEntity` - 转发
- `WeiboPostSnapshotEntity` - 内容快照

### 事件分析
- `EventEntity` - 事件主体
- `EventCategoryEntity` - 事件分类
- `EventTagEntity` - 事件标签
- `EventTagRelationEntity` - 标签关联
- `EventStatisticsEntity` - 统计快照

### 工作流
- `WorkflowEntity` - 流程定义
- `WorkflowScheduleEntity` - 调度配置
- `WorkflowRunEntity` - 执行记录
- `WorkflowRunLogEntity` - 执行日志

### 分类系统
- `WeiboUserCategoryEntity` - 用户分类定义
- `WeiboUserCategoryRelationEntity` - 分类关联
- `PostNlpResultEntity` - NLP 分析结果

## 数据访问

### DataSource 管理

```typescript
import { useDataSource, useEntityManager } from '@sker/entities';

// 获取数据源
const ds = await useDataSource();

// 使用实体管理器
await useEntityManager(async (m) => {
  return m.find(EventEntity);
});
```

### 查询构建器

```typescript
import { findHotEvents, findEventList } from '@sker/entities';

// 获取热门事件
const hotEvents = await findHotEvents('today', 10);

// 查询事件列表
const events = await findEventList('thisWeek', {
  category: '社会',
  search: '关键词',
  limit: 20
});
```

### 时间范围查询

支持的时间范围：
- `today` / `yesterday`
- `thisWeek` / `lastWeek`
- `thisMonth` / `lastMonth`
- `thisQuarter` / `lastQuarter`
- `halfYear` / `lastHalfYear`
- `thisYear` / `lastYear`
- `all`

## 依赖注入

通过 `@sker/core` 实现实体的自动注册：

```typescript
import { Entity } from './decorator';

@Entity('table_name')
export class MyEntity {
  // ...
}
```

装饰器会自动将实体注册到依赖注入容器。

## 数据库配置

通过 `DATABASE_URL` 环境变量配置数据库连接：

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

## 开发

```bash
# 构建
pnpm build

# 开发模式（带热重载）
pnpm dev

# 类型检查
pnpm check-types
```

## 设计原则

1. **单一职责** - 每个实体仅关注自身数据模型
2. **关注分离** - 查询逻辑独立于实体定义
3. **函数式思维** - 使用 `useEntityManager` 包装异步操作
4. **类型安全** - 充分利用 TypeScript 类型推导
5. **代码即文档** - 通过清晰的命名和结构表达意图
