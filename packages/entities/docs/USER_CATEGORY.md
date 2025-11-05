# 微博用户分类系统

## 概述

用户分类系统为微博用户提供了多维度的类型标签，支持从认证类型、影响力、账户能力和行业领域四个维度对用户进行分类。

## 核心实体

### WeiboUserCategoryEntity (用户分类)

存储所有可用的分类标签。

**字段说明：**
- `code`: 唯一标识码 (如: `top_influencer`, `media`)
- `name`: 中文名称
- `name_en`: 英文名称
- `dimension`: 分类维度 (`verification` | `influence` | `capability` | `industry`)
- `description`: 分类描述
- `icon`: 图标标识
- `color`: 展示颜色
- `sort`: 排序权重
- `status`: 启用状态

### WeiboUserCategoryRelationEntity (用户分类关系)

存储用户与分类的多对多关系。

**字段说明：**
- `user_id`: 用户ID
- `category_id`: 分类ID
- `confidence_score`: 置信度得分 (0-1)
- `source`: 分类来源 (`manual` | `auto` | `nlp` | `imported`)

## 分类维度

### 1. 认证类型 (verification)

基于微博官方认证状态划分：

| Code | 名称 | 条件 |
|------|------|------|
| `ordinary` | 普通用户 | 未认证 |
| `personal_verified` | 个人认证 | 黄V认证 |
| `org_verified` | 机构认证 | 蓝V认证 |
| `institution_verified` | 政务认证 | 政府机构认证 |
| `other_verified` | 其他认证 | 其他类型认证 |

### 2. 影响力 (influence)

基于粉丝数量划分：

| Code | 名称 | 粉丝数范围 |
|------|------|------------|
| `top_influencer` | 头部KOL | ≥ 100万 |
| `major_influencer` | 头部达人 | 10万 - 100万 |
| `mid_influencer` | 腰部达人 | 1万 - 10万 |
| `micro_influencer` | 尾部达人 | 1千 - 1万 |
| `tail_user` | 长尾用户 | < 1千 |

### 3. 账户能力 (capability)

基于账户开通的功能权限：

| Code | 名称 | 判断依据 |
|------|------|----------|
| `brand_account` | 品牌账号 | `brand_ability` > 0 |
| `ecommerce_account` | 电商账号 | `ecommerce_ability` > 0 |
| `live_streamer` | 直播达人 | `live_ability` > 0 |
| `video_creator` | 视频创作者 | `video_status_count` > 10 |
| `content_creator` | 内容创作者 | `paycolumn_ability` 或 `wbcolumn_ability` > 0 |

### 4. 行业领域 (industry)

基于认证行业信息：

| Code | 名称 | 匹配关键词 |
|------|------|------------|
| `media` | 媒体 | 媒体 |
| `news` | 新闻 | 新闻 |
| `entertainment` | 娱乐 | 娱乐、影视、音乐 |
| `finance` | 财经 | 财经、金融 |
| `tech` | 科技 | 科技、互联网 |
| `sports` | 体育 | 体育 |
| `education` | 教育 | 教育 |
| `healthcare` | 医疗健康 | 医疗、健康 |
| `government` | 政府公共服务 | 政府、公共服务 |
| `corporate` | 企业 | 企业 |

## 使用指南

### 1. 初始化分类数据

```typescript
import { seedUserCategories } from './examples/user-category-usage.example';

await seedUserCategories(entityManager);
```

### 2. 自动分类单个用户

```typescript
import { classifyUser } from './examples/user-category-usage.example';

await classifyUser(entityManager, 1234567890); // 用户ID
```

### 3. 批量分类用户

```typescript
import { batchClassifyUsers } from './examples/user-category-usage.example';

await batchClassifyUsers(entityManager, 100); // 分类前100个用户
```

### 4. 查询用户的分类标签

```typescript
import { getUserWithCategories } from './examples/user-category-usage.example';

await getUserWithCategories(entityManager, 1234567890);
```

### 5. 按分类查询用户

```typescript
import { getUsersByCategory } from './examples/user-category-usage.example';

await getUsersByCategory(entityManager, 'top_influencer', 10);
```

### 6. 影响力分布统计

```typescript
import { getInfluencerStatistics } from './examples/user-category-usage.example';

await getInfluencerStatistics(entityManager);
```

## 分类推断逻辑

### UserCategoryClassifier

核心分类工具类，提供自动推断能力。

**方法：**
```typescript
static classify(user: WeiboUserEntity): ClassificationResult[]
```

**返回值：**
```typescript
interface ClassificationResult {
  categoryCode: string;    // 分类代码
  dimension: CategoryDimension; // 分类维度
  confidence: number;      // 置信度 (0-1)
  reason?: string;         // 推断原因（可选）
}
```

### 推断规则

#### 认证类型推断
- 基于 `verified` 和 `verified_type` 字段
- 置信度：1.0（完全确定）

#### 影响力推断
- 基于 `followers_count` 字段
- 置信度：1.0（完全确定）

#### 账户能力推断
- 基于各种 `*_ability` 字段
- 置信度：0.8-1.0（视具体情况而定）

#### 行业领域推断
- 基于 `verified_trade` 字段的关键词匹配
- 置信度：0.8-1.0（视匹配准确度而定）

## 数据库迁移

创建分类表和关系表：

```sql
-- 用户分类表
CREATE TABLE weibo_user_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  dimension VARCHAR(20) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_weibo_user_categories_code ON weibo_user_categories(code);
CREATE INDEX idx_weibo_user_categories_dimension ON weibo_user_categories(dimension);
CREATE INDEX idx_weibo_user_categories_status ON weibo_user_categories(status);

-- 用户分类关系表
CREATE TABLE weibo_user_category_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL,
  category_id UUID NOT NULL,
  confidence_score DECIMAL(5,2) DEFAULT 1.0,
  source VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES weibo_users(id),
  FOREIGN KEY (category_id) REFERENCES weibo_user_categories(id)
);

CREATE UNIQUE INDEX idx_weibo_user_category_relations_unique
  ON weibo_user_category_relations(user_id, category_id);
CREATE INDEX idx_weibo_user_category_relations_user
  ON weibo_user_category_relations(user_id);
CREATE INDEX idx_weibo_user_category_relations_category
  ON weibo_user_category_relations(category_id);
CREATE INDEX idx_weibo_user_category_relations_confidence
  ON weibo_user_category_relations(confidence_score);
```

## 查询示例

### 查询头部KOL列表

```typescript
const topInfluencers = await manager
  .createQueryBuilder(WeiboUserEntity, 'user')
  .innerJoin('user.categories', 'relation')
  .innerJoin('relation.category', 'category')
  .where('category.code = :code', { code: 'top_influencer' })
  .orderBy('user.followers_count', 'DESC')
  .limit(10)
  .getMany();
```

### 查询媒体类账号的影响力分布

```typescript
const mediaInfluence = await manager
  .createQueryBuilder(WeiboUserCategoryRelationEntity, 'relation')
  .innerJoin('relation.category', 'category')
  .innerJoin('relation.user', 'user')
  .innerJoin('user.categories', 'relation2')
  .innerJoin('relation2.category', 'industry')
  .where('industry.code = :industryCode', { industryCode: 'media' })
  .andWhere('category.dimension = :dimension', { dimension: 'influence' })
  .select('category.name', 'influence_level')
  .addSelect('COUNT(*)', 'count')
  .groupBy('category.name')
  .getRawMany();
```

### 查询同时具有多个标签的用户

```typescript
const videoLiveStreamers = await manager
  .createQueryBuilder(WeiboUserEntity, 'user')
  .innerJoin('user.categories', 'relation1')
  .innerJoin('relation1.category', 'category1')
  .innerJoin('user.categories', 'relation2')
  .innerJoin('relation2.category', 'category2')
  .where('category1.code = :code1', { code1: 'video_creator' })
  .andWhere('category2.code = :code2', { code2: 'live_streamer' })
  .getMany();
```

## 扩展建议

### 1. 自定义分类

可以通过插入新的分类记录来扩展分类体系：

```typescript
const customCategory = manager.create(WeiboUserCategoryEntity, {
  code: 'custom_category',
  name: '自定义分类',
  name_en: 'Custom Category',
  dimension: 'capability',
  description: '自定义分类说明',
  icon: 'custom-icon',
  color: '#CUSTOM',
  sort: 999,
  status: 'active',
});

await manager.save(customCategory);
```

### 2. 基于NLP的分类

可以接入NLP分析结果，通过用户简介、发文内容等进行更精准的分类：

```typescript
const nlpResult = await analyzeUserProfile(user);

for (const tag of nlpResult.tags) {
  const relation = manager.create(WeiboUserCategoryRelationEntity, {
    user_id: user.id,
    category_id: tag.categoryId,
    confidence_score: tag.confidence,
    source: 'nlp',
  });

  await manager.save(relation);
}
```

### 3. 手动标注

支持人工手动标注，提高分类准确度：

```typescript
async function manualLabel(
  userId: number,
  categoryCode: string
): Promise<void> {
  const category = await manager.findOne(WeiboUserCategoryEntity, {
    where: { code: categoryCode },
  });

  const relation = manager.create(WeiboUserCategoryRelationEntity, {
    user_id: userId,
    category_id: category!.id,
    confidence_score: 1.0,
    source: 'manual',
  });

  await manager.upsert(
    WeiboUserCategoryRelationEntity,
    relation,
    ['user_id', 'category_id']
  );
}
```

## 注意事项

1. **多分类支持**：一个用户可以拥有多个分类标签（不同维度或同维度）
2. **置信度管理**：自动推断的置信度通常低于手动标注
3. **数据更新**：用户数据变化时应重新进行分类
4. **性能优化**：批量分类时建议分批处理，避免内存溢出
5. **数据一致性**：确保分类种子数据在使用前已初始化

## 文件结构

```
packages/entities/src/
├── weibo-user-category.entity.ts           # 分类实体
├── weibo-user-category-relation.entity.ts  # 关系实体
├── weibo-user.entity.ts                     # 用户实体（已更新）
├── utils/
│   └── user-category-classifier.ts         # 分类推断工具
├── seeds/
│   └── weibo-user-categories.seed.ts       # 分类种子数据
├── examples/
│   └── user-category-usage.example.ts      # 使用示例
└── docs/
    └── USER_CATEGORY.md                     # 本文档
```

## 相关实体

- `WeiboUserEntity`: 微博用户实体
- `WeiboPostEntity`: 微博内容实体
- `EventEntity`: 事件实体
- `EventCategoryEntity`: 事件分类实体（设计参考）
