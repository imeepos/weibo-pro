# Crawler Core Entities

TypeORM 实体定义，与 MediaCrawler 数据库表结构保持一致。

## 实体结构

### 基础实体

- **BaseEntity**: 所有实体的基类，包含 `id`, `add_ts`, `last_modify_ts`
- **BaseContentEntity**: 内容实体基类，继承 BaseEntity，添加用户信息字段
- **BaseCommentEntity**: 评论实体基类，继承 BaseContentEntity，添加评论相关字段
- **BaseCreatorEntity**: 创作者实体基类，继承 BaseContentEntity，添加创作者统计字段

### 平台实体

#### 小红书 (XHS)
- `XhsNote`: 小红书笔记
- `XhsNoteComment`: 小红书评论
- `XhsCreator`: 小红书创作者

#### 抖音 (Douyin)
- `DouyinAweme`: 抖音视频
- `DouyinAwemeComment`: 抖音评论
- `DyCreator`: 抖音创作者

#### B站 (Bilibili)
- `BilibiliVideo`: B站视频
- `BilibiliVideoComment`: B站评论
- `BilibiliUpInfo`: B站UP主信息

#### 微博 (Weibo)
- `WeiboNote`: 微博帖子
- `WeiboNoteComment`: 微博评论
- `WeiboCreator`: 微博创作者

#### 快手 (Kuaishou)
- `KuaishouVideo`: 快手视频
- `KuaishouVideoComment`: 快手评论

#### 贴吧 (Tieba)
- `TiebaNote`: 贴吧帖子
- `TiebaComment`: 贴吧评论
- `TiebaCreator`: 贴吧创作者

#### 知乎 (Zhihu)
- `ZhihuContent`: 知乎内容
- `ZhihuComment`: 知乎评论
- `ZhihuCreator`: 知乎创作者

## 使用示例

```typescript
import { XhsNote, DouyinAweme, BilibiliVideo } from '@sker/crawler-core';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'crawler',
  entities: [XhsNote, DouyinAweme, BilibiliVideo],
  synchronize: true,
});

await dataSource.initialize();
```

## 索引优化

所有实体都定义了必要的索引以优化查询性能：
- 主键 ID 索引
- 内容 ID 索引（note_id, video_id, aweme_id 等）
- 时间索引（create_time, publish_time 等）
- 用户 ID 索引
