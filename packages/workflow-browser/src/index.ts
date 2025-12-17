// 导入即自动注册（通过 @Injectable 装饰器）
import './WeiboLoginBrowserVisitor.js';
import './WeiboKeywordSearchBrowserVisitor.js';
import './WeiboAjaxStatusesShowBrowserVisitor.js';
import './WeiboAjaxStatusesCommentBrowserVisitor.js';
import './WeiboAjaxStatusesRepostTimelineBrowserVisitor.js';
import './WeiboAjaxStatusesLikeShowBrowserVisitor.js';
import './WeiboAjaxStatusesMymblogBrowserVisitor.js';
import './WeiboAjaxProfileInfoBrowserVisitor.js';
import './WeiboAjaxFriendshipsBrowserVisitor.js';
import './WeiboAjaxFeedHotTimelineBrowserVisitor.js';
import './PostContextCollectorBrowserVisitor.js';
import './PostNLPAnalyzerBrowserVisitor.js';
import './EventAutoCreatorBrowserVisitor.js';
import './WorkflowGraphBrowserVisitor.js';
import "./WeiboUserDetectionAstVisitor.js";
import "./LlmTextAgentAstVisitor.js";
import "./WeiboAccountPickAstBrowserVisitor.js";
import "./ShareAstVisitor.js";
import "./StoreVisitor.js";
import "./MqVisitor.js";
import "./LlmStructuredOutputAstVisitor.js";
import "./LlmCategoryAstVisitor.js";
import "./MergeAstVisitor.js";
import "./LoopAstVisitor.js";
import "./PersonaAstBrowserVisitor.js";
import "./PersonaCreatorAstVisitor.js";
import "./PromptRoleSkillAstVisitor.js";
import "./QueryRewriterAstVisitor.js";
import "./AnswerFinalizerAstVisitor.js";
import "./AnswerEvaluatorAstVisitor.js";
import "./ErrorAnalyzerAstVisitor.js";
import "./ResearchPlannerAstVisitor.js";
import "./SerpClusterAstVisitor.js";
import "./StoryWeaverAstVisitor.js";

// EventStore - 注册浏览器端 LocalStorage 存储实现
import { root } from '@sker/core'
import { EVENT_STORE } from '@sker/workflow'
import { LocalStorageEventStore } from './event-store/local-storage.js'

root.set([
    { provide: EVENT_STORE, useClass: LocalStorageEventStore }
])

// 导出初始化函数
export { initBrowserWorkflowRuntime } from './init-runtime.js';
