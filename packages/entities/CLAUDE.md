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
