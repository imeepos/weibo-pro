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
import "./WeiboAccountPickAstBrowserVisitor.js"

// 微博 API 节点浏览器端执行器
export { WeiboLoginBrowserVisitor } from './WeiboLoginBrowserVisitor.js';
export { WeiboKeywordSearchBrowserVisitor } from './WeiboKeywordSearchBrowserVisitor.js';
export { WeiboAjaxStatusesShowBrowserVisitor } from './WeiboAjaxStatusesShowBrowserVisitor.js';
export { WeiboAjaxStatusesCommentBrowserVisitor } from './WeiboAjaxStatusesCommentBrowserVisitor.js';
export { WeiboAjaxStatusesRepostTimelineBrowserVisitor } from './WeiboAjaxStatusesRepostTimelineBrowserVisitor.js';
export { WeiboAjaxStatusesLikeShowBrowserVisitor } from './WeiboAjaxStatusesLikeShowBrowserVisitor.js';
export { WeiboAjaxStatusesMymblogBrowserVisitor } from './WeiboAjaxStatusesMymblogBrowserVisitor.js';
export { WeiboAjaxProfileInfoBrowserVisitor } from './WeiboAjaxProfileInfoBrowserVisitor.js';
export { WeiboAjaxFriendshipsBrowserVisitor } from './WeiboAjaxFriendshipsBrowserVisitor.js';
export { WeiboAjaxFeedHotTimelineBrowserVisitor } from './WeiboAjaxFeedHotTimelineBrowserVisitor.js';

// 数据处理节点浏览器端执行器
export { PostContextCollectorBrowserVisitor } from './PostContextCollectorBrowserVisitor.js';
export { PostNLPAnalyzerBrowserVisitor } from './PostNLPAnalyzerBrowserVisitor.js';
export { EventAutoCreatorBrowserVisitor } from './EventAutoCreatorBrowserVisitor.js';

// 基础节点浏览器端执行器
export { WorkflowGraphBrowserVisitor } from './WorkflowGraphBrowserVisitor.js';
// 类型导出
export type { WeiboLoginEvent, WeiboLoginEventType } from './WeiboLoginBrowserVisitor.js';

export { WeiboUserDetectionAstVisitor } from './WeiboUserDetectionAstVisitor.js'
export { LlmTextAgentAstVisitor } from './LlmTextAgentAstVisitor.js';
export { TextAreaAstVisitor } from './TextAreaAstVisitor.js'
export { DateAstVisitor } from './DateAstVisitor.js'
export { WeiboAccountPickAstBrowserVisitor } from './WeiboAccountPickAstBrowserVisitor.js'