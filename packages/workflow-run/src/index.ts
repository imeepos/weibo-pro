export { WeiboAccountService } from './services/weibo-account.service'

// 舆情节点
export { KeywordAgentAstVisitor } from './KeywordAgentAstVisitor'

export { WeiboAjaxFeedHotTimelineAstVisitor } from './WeiboAjaxFeedHotTimelineAstVisitor'
export { WeiboAjaxFriendshipsAstVisitor } from './WeiboAjaxFriendshipsAstVisitor'
export { WeiboAjaxProfileInfoAstVisitor } from './WeiboAjaxProfileInfoAstVisitor'
export { WeiboAjaxStatusesCommentAstVisitor } from './WeiboAjaxStatusesCommentAstVisitor'
export { WeiboAjaxStatusesLikeShowAstVisitor } from './WeiboAjaxStatusesLikeShowAstVisitor'
export { WeiboAjaxStatusesMymblogAstVisitor } from './WeiboAjaxStatusesMymblogAstVisitor'
export { WeiboAjaxStatusesRepostTimelineAstVisitor } from './WeiboAjaxStatusesRepostTimelineAstVisitor'
export { WeiboAjaxStatusesShowAstVisitor } from './WeiboAjaxStatusesShowAstVisitor'
export { WeiboKeywordSearchAstVisitor } from './WeiboKeywordSearchAstVisitor'
export { PostContextCollectorVisitor } from './PostContextCollectorVisitor'
export { PostNLPAnalyzerVisitor } from './PostNLPAnalyzerVisitor'
export { PostNLPLooperAstVisitor } from './PostNLPLooperAstVisitor'
export { EventAuthGenerateAstVisitor } from './EventAuthGenerateAstVisitor'
export { EventAstVisitor } from './EventAstVisitor'
export { WeiboLoginAstVisitor } from './WeiboLoginAstVisitor'
export { WeiboAccountPickAstVisitor } from './WeiboAccountPickAstVisitor'
export { LlmTextAgentAstVisitor } from './LlmTextAgentAstVisitor'
export { LlmStructuredOutputAstVisitor } from './LlmStructuredOutputAstVisitor'
export { LlmCategoryAstVisitor } from './LlmCategoryAstVisitor'
export { StoryWeaverAstVisitor } from './StoryWeaverAstVisitor'

// 消息队列节点
export { MqPushAstVisitor, MqPullAstVisitor } from './MqAstVisitor'

// 存储节点
export { StoreGetAstVisitor, StoreSetAstVisitor } from './StoreAstVisitor'

// 数据处理节点
export { MergeAstVisitor } from './MergeAstVisitor'
export { LoopAstVisitor } from './LoopAstVisitor'

// 群聊节点
export { ShareAstVisitor } from './ShareAstVisitor'
export { GroupChatLoopAstVisitor } from './GroupChatLoopAstVisitor'

// 属性选择器节点
export { PropertySelectorAstVisitor } from './PropertySelectorAstVisitor'

// 取最后值节点
export { LastAstVisitor } from './LastAstVisitor'

// 故事质量循环节点
export { StoryQualityLoopAstVisitor } from './StoryQualityLoopAstVisitor'

// 角色记忆节点
export { PersonaAstVisitor } from './PersonaAstVisitor'

// 创建人物节点
export { PersonaCreatorAstVisitor } from './PersonaCreatorAstVisitor'

// LLM 客户端
export { useLlmModel } from './llm-client'

// 角色技能节点
export { PromptRoleSkillAstVisitor } from './PromptRoleSkillAstVisitor'

// 查询重写节点
export { QueryRewriterAstVisitor } from './QueryRewriterAstVisitor'

// 答案终稿器节点
export { AnswerFinalizerAstVisitor } from './AnswerFinalizerAstVisitor'

// 错误分析器节点
export { ErrorAnalyzerAstVisitor } from './ErrorAnalyzerAstVisitor'

// 研究规划器节点
export { ResearchPlannerAstVisitor } from './ResearchPlannerAstVisitor'

// 答案评估器节点
export { AnswerEvaluatorAstVisitor } from './AnswerEvaluatorAstVisitor'

// 定时调度节点
export { ScheduledWorkflowVisitor } from './ScheduledWorkflowVisitor'

// 代码生成节点
export { CodeGeneratorAstVisitor } from './CodeGeneratorAstVisitor'

// 工作流节点生成器
export { WorkflowNodeGeneratorAstVisitor } from './WorkflowNodeGeneratorAstVisitor'

// 临时邮箱节点
export { EmailD1AstVisitor } from './EmailD1AstVisitor'

// 代理自动选择节点
export { ProxyAutoSelectAstVisitor } from './ProxyAutoSelectAstVisitor'

// HTTP 请求节点
export { HttpRequestAstVisitor } from './HttpRequestAstVisitor'

// SQL 执行节点
export { SqlExecuteAstVisitor } from './SqlExecuteAstVisitor'

// 进程执行节点
export { ClaudeCodeAstVisitor } from './ClaudeCodeAstVisitor'

// Markdown 上传节点
export { MarkdownUploadAstVisitor } from './MarkdownUploadAstVisitor'

// Excel 上传节点
export { ExcelUploadAstVisitor } from './ExcelUploadAstVisitor'

// Claude Code 节点
export { ClaudeCodeReviewAstVisitor } from './ClaudeCodeReviewAstVisitor'
export { ClaudeCodeRefactorAstVisitor } from './ClaudeCodeRefactorAstVisitor'

// 提示词优化节点
export { PromptOptimizerAstVisitor } from './PromptOptimizerAstVisitor'

// 服务
export { ClaudeCodeService } from './services/claude-code.service'
export { CronSchedulerService } from './services/CronSchedulerService'
export { WorkflowExecutionService } from './services/WorkflowExecutionService'
export { ChapterQualityService } from './services/ChapterQualityService'
export { StreamingLlmInvoker } from './services/StreamingLlmInvoker'

// EventStore - 注册后端数据库存储实现
import { root } from '@sker/core'
import { EVENT_STORE, DEFAULT_VISITOR, DefaultVisitor } from '@sker/workflow'
import { DatabaseEventStore } from './event-store/database'

root.set([
    { provide: EVENT_STORE, useClass: DatabaseEventStore },
    // 后端使用 DefaultVisitor（本地执行）
    { provide: DEFAULT_VISITOR, useClass: DefaultVisitor }
])
