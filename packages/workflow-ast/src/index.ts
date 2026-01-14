/**
 * @sker/workflow-ast - 工作流节点定义
 *
 * 按 @Node 装饰器的 type 字段组织：
 * - llm: 大模型节点 (26个)
 * - crawler: 爬虫/数据采集节点 (16个)
 * - basic: 基础节点 (8个)
 * - sentiment: 舆情分析节点 (6个)
 * - control: 控制流节点 (2个)
 * - analysis: 分析节点 (1个)
 * - scheduler: 调度节点 (1个)
 */

// LLM 节点 (26个)
export { ErrorAnalyzerAst } from './llm/ErrorAnalyzerAst';
export { GroupChatLoopAst } from './llm/GroupChatLoopAst';
export { LlmTextAgentAst } from './llm/LlmTextAgentAst';
export { CodeGeneratorAst } from './llm/CodeGeneratorAst';
export { StoryWeaverAst } from './llm/StoryWeaverAst';
export { LlmTextImage2ToVideoAst } from './llm/LlmTextImage2ToVideoAst';
export { LlmTextImageToVideoAst } from './llm/LlmTextImageToVideoAst';
export { LlmTextToAudioAst } from './llm/LlmTextToAudioAst';
export { LlmTextToImageAst } from './llm/LlmTextToImageAst';
export { LlmTextToVideoAst } from './llm/LlmTextToVideoAst';
export { WorkflowNodeGeneratorAst } from './llm/WorkflowNodeGeneratorAst';
export { PromptOptimizerAst } from './llm/PromptOptimizerAst';
export { QualityCheckerAst } from './llm/QualityCheckerAst';
export { AnswerEvaluatorAst } from './llm/AnswerEvaluatorAst';
export { AnswerFinalizerAst } from './llm/AnswerFinalizerAst';
export { QueryRewriterAst } from './llm/QueryRewriterAst';
export { ResearchPlannerAst } from './llm/ResearchPlannerAst';
export { LlmImageToTextAst } from './llm/LlmImageToTextAst';
export { LlmStructuredOutputAst } from './llm/LlmStructuredOutputAst';
export { LlmVideoToTextAst } from './llm/LlmVideoToTextAst';
export { PersonaAst } from './llm/PersonaAst';
export { PersonaCreatorAst } from './llm/PersonaCreatorAst';
export { PromptRoleSkillAst } from './llm/PromptRoleSkillAst';

// CRAWLER 节点 (17个)
export { ProxyAutoSelectAst } from './crawler/ProxyAutoSelectAst';
export { WeiboAccountPickAst } from './crawler/WeiboAccountPickAst';
export { WeiboLoginAst } from './crawler/WeiboLoginAst';
export { WeiboUserDetectionAst } from './crawler/WeiboUserDetectionAst';
export { WeiboAjaxStatusesCommentAst } from './crawler/WeiboAjaxStatusesCommentAst';
export { WeiboAjaxStatusesLikeShowAst } from './crawler/WeiboAjaxStatusesLikeShowAst';
export { WeiboAjaxStatusesMymblogAst } from './crawler/WeiboAjaxStatusesMymblogAst';
export { WeiboAjaxStatusesRepostTimelineAst } from './crawler/WeiboAjaxStatusesRepostTimelineAst';
export { WeiboAjaxStatusesShowAst } from './crawler/WeiboAjaxStatusesShowAst';
export { WeiboAjaxFeedHotTimelineAst } from './crawler/WeiboAjaxFeedHotTimelineAst';
export { WeiboKeywordSearchAst } from './crawler/WeiboKeywordSearchAst';
export { WeiboAjaxFriendshipsAst } from './crawler/WeiboAjaxFriendshipsAst';
export { WeiboAjaxProfileInfoAst } from './crawler/WeiboAjaxProfileInfoAst';
export { PostNLPAnalyzerAst } from './crawler/PostNLPAnalyzerAst';
export { PostContextCollectorAst } from './crawler/PostContextCollectorAst';
export { PostNLPLooperAst } from './crawler/PostNLPLooperAst';
export { EventAuthGenerateAst } from './crawler/EventAuthGenerateAst';

// BASIC 节点 (10个)
export { SqlExecuteAst } from './basic/SqlExecuteAst';
export { ExcelUploadAst } from './basic/ExcelUploadAst';
export { MarkdownUploadAst } from './basic/MarkdownUploadAst';
export { EmailD1Ast } from './basic/EmailD1Ast';
export { ShareAst } from './basic/ShareAst';
export { EventAst } from './basic/EventAst';
export { PropertySelectorAst } from './basic/PropertySelectorAst';
export { LastAst } from './basic/LastAst';
export { ClaudeCodeAst, type ClaudeStreamEvent } from './basic/ClaudeCodeAst';
// CONTROL 节点 (2个)
export { LlmCategoryAst } from './control/LlmCategoryAst';
export { StoryQualityLoopAst } from './control/StoryQualityLoopAst';

// SENTIMENT 节点 (6个)
export { InsightAgentAst } from './sentiment/InsightAgentAst';
export { KeywordAgentAst } from './sentiment/KeywordAgentAst';
export type { SearchStrategy } from './sentiment/KeywordAgentAst';
export { MediaAgentAst } from './sentiment/MediaAgentAst';
export { QueryAgentAst } from './sentiment/QueryAgentAst';
export { ReportAgentAst } from './sentiment/ReportAgentAst';
export { ForumAgentAst } from './sentiment/ForumAgentAst';

// ANALYSIS 节点 (1个)
export { SerpClusterAst } from './analysis/SerpClusterAst';

// SCHEDULER 节点 (1个)
export { ScheduledWorkflowAst } from './scheduler/ScheduledWorkflowAst';


// Meta 节点（保持原有导出）
export { LlmInferenceAst } from './meta/LlmInferenceAst';
export { TransformAst } from './meta/TransformAst';
export { RouteAst } from './meta/RouteAst';
export { AggregateAst } from './meta/AggregateAst';
export { HttpRequestAst } from './meta/HttpRequestAst';
export { HtmlDisplayAst } from './meta/HtmlDisplayAst';
export { JsonDisplayAst } from './meta/JsonDisplayAst';

// 类型导出
export type { ChapterData, Clue } from './llm/StoryWeaverAst';
export type { RewriteRequest } from './control/StoryQualityLoopAst';
export type { QualityResult, QualityDimension } from './llm/QualityCheckerAst';
export type { EvaluationDimension, OptimizationResult, PromptVersionSummary } from './llm/PromptOptimizerAst';
export type { EvaluationResult, EvaluationType } from './llm/AnswerEvaluatorAst';
export type { MarkdownHeading } from './basic/MarkdownUploadAst';
export type { RetrievedMemory } from './llm/PersonaAst';
export type { SqlParameter, SqlColumn } from './basic/SqlExecuteAst';
export type { AggregateOperation } from './meta/AggregateAst';
