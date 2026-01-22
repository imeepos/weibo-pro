/**
 * 浏览器端专用入口
 * 只导出类型和纯工具函数，不包含任何服务端依赖（typeorm、@sker/redis等）
 */

// 导出类型 - 这些会被 TypeScript 编译掉，不会产生运行时依赖
export type { TimeRange } from './utils/pure'

// 导出纯工具函数 - 不依赖任何 Node.js 模块
export { getDateRangeByTimeRange } from './utils/pure'

// 导出实体类型（仅类型）- 注意：所有实体类都有 Entity 后缀
export type { WeiboUserEntity as WeiboUser } from './weibo-user.entity'
export type { WeiboUserCategoryEntity as WeiboUserCategory } from './weibo-user-category.entity'
export type { WeiboUserCategoryRelationEntity as WeiboUserCategoryRelation } from './weibo-user-category-relation.entity'
export type { WeiboPostEntity as WeiboPost } from './weibo-post.entity'
export type { WeiboPostSnapshotEntity as WeiboPostSnapshot } from './weibo-post-snapshot.entity'
export type { WeiboCommentEntity as WeiboComment } from './weibo-comment.entity'
export type { WeiboLikeEntity as WeiboLike } from './weibo-like.entity'
export type { WeiboRepostEntity as WeiboRepost } from './weibo-repost.entity'
export type { WeiboAccountEntity as WeiboAccount } from './weibo-account.entity'

export type { EventEntity as Event } from './event.entity'
export type { EventCategoryEntity as EventCategory } from './event-category.entity'
export type { EventTagEntity as EventTag } from './event-tag.entity'
export type { EventTagRelationEntity as EventTagRelation } from './event-tag-relation.entity'
export type { EventHourlyStatisticsEntity as EventHourlyStatistics } from './event-hourly-statistics.entity'

export type { WorkflowEntity as Workflow } from './workflow.entity'
export type { WorkflowScheduleEntity as WorkflowSchedule } from './workflow-schedule.entity'
export type { WorkflowRunEntity as WorkflowRun } from './workflow-run.entity'
export type { WorkflowRunLogEntity as WorkflowRunLog } from './workflow-run-log.entity'

export type { LlmProvider } from './llm-provider'
export type { LlmModel } from './llm-model'
export type { LlmModelProvider } from './llm-model-provider'
export type { LlmChatLog } from './llm-chat-log'

export type { PromptRoleEntity as PromptRole } from './prompt-role.entity'
export type { PromptSkillEntity as PromptSkill } from './prompt-skill.entity'
export type { PromptRoleSkillRefEntity as PromptRoleSkillRef } from './prompt-role-skill-ref.entity'

export type { PersonaEntity as Persona } from './persona.entity'
export type { PostNLPResultEntity as PostNlpResult } from './post-nlp-result.entity'
export type { LayoutConfigurationEntity as LayoutConfiguration } from './layout-configuration.entity'

export type { MemoryEntity as Memory } from './memory.entity'
export type { MemoryRelationEntity as MemoryRelation } from './memory-relation.entity'
export type { MemoryClosureEntity as MemoryClosure } from './memory-closure.entity'

export type { UserRelationStatistics } from './user-relation-statistics.entity'
export type { OverviewStatistics } from './overview-statistics.entity'

export type { PromptOptimizationTaskEntity as PromptOptimizationTask } from './prompt-optimization-task.entity'
export type { PromptVersionEntity as PromptVersion } from './prompt-version.entity'
export type { DerivedNodeEntity as DerivedNode } from './derived-node.entity'

// 情感分析类型
export type { SentimentScore } from './types/sentiment'
