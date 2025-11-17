// 导入即自动注册（通过 @Injectable 装饰器）
import './WeiboLoginBrowserVisitor';
import './WeiboKeywordSearchBrowserVisitor';
import './WeiboAjaxStatusesShowBrowserVisitor';
import './WeiboAjaxStatusesCommentBrowserVisitor';
import './WeiboAjaxStatusesRepostTimelineBrowserVisitor';
import './WeiboAjaxStatusesLikeShowBrowserVisitor';
import './WeiboAjaxStatusesMymblogBrowserVisitor';
import './WeiboAjaxProfileInfoBrowserVisitor';
import './WeiboAjaxFriendshipsBrowserVisitor';
import './WeiboAjaxFeedHotTimelineBrowserVisitor';
import './PostContextCollectorBrowserVisitor';
import './PostNLPAnalyzerBrowserVisitor';
import './EventAutoCreatorBrowserVisitor';
import './BatchPushToMQBrowserVisitor';
import './CodeExecutorBrowserVisitor';
import './TestFormBrowserVisitor';
import './WorkflowGraphBrowserVisitor';
import './ArrayIteratorBrowserVisitor';

// 微博 API 节点浏览器端执行器
export { WeiboLoginBrowserVisitor } from './WeiboLoginBrowserVisitor';
export { WeiboKeywordSearchBrowserVisitor } from './WeiboKeywordSearchBrowserVisitor';
export { WeiboAjaxStatusesShowBrowserVisitor } from './WeiboAjaxStatusesShowBrowserVisitor';
export { WeiboAjaxStatusesCommentBrowserVisitor } from './WeiboAjaxStatusesCommentBrowserVisitor';
export { WeiboAjaxStatusesRepostTimelineBrowserVisitor } from './WeiboAjaxStatusesRepostTimelineBrowserVisitor';
export { WeiboAjaxStatusesLikeShowBrowserVisitor } from './WeiboAjaxStatusesLikeShowBrowserVisitor';
export { WeiboAjaxStatusesMymblogBrowserVisitor } from './WeiboAjaxStatusesMymblogBrowserVisitor';
export { WeiboAjaxProfileInfoBrowserVisitor } from './WeiboAjaxProfileInfoBrowserVisitor';
export { WeiboAjaxFriendshipsBrowserVisitor } from './WeiboAjaxFriendshipsBrowserVisitor';
export { WeiboAjaxFeedHotTimelineBrowserVisitor } from './WeiboAjaxFeedHotTimelineBrowserVisitor';

// 数据处理节点浏览器端执行器
export { PostContextCollectorBrowserVisitor } from './PostContextCollectorBrowserVisitor';
export { PostNLPAnalyzerBrowserVisitor } from './PostNLPAnalyzerBrowserVisitor';
export { EventAutoCreatorBrowserVisitor } from './EventAutoCreatorBrowserVisitor';
export { BatchPushToMQBrowserVisitor } from './BatchPushToMQBrowserVisitor';

// 基础节点浏览器端执行器
export { CodeExecutorBrowserVisitor } from './CodeExecutorBrowserVisitor';
export { TestFormBrowserVisitor } from './TestFormBrowserVisitor';
export { WorkflowGraphBrowserVisitor } from './WorkflowGraphBrowserVisitor';
export { ArrayIteratorBrowserVisitor } from './ArrayIteratorBrowserVisitor';

// 类型导出
export type { WeiboLoginEvent, WeiboLoginEventType } from './WeiboLoginBrowserVisitor';

