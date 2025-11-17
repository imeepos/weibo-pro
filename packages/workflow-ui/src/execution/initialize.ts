import { ExecutorFinder } from './executor-registry'
import { frontendExecutorRegistry } from './frontend-executor'
import { WeiboLoginExecutor, RealtimeStatusExecutor } from './special-executors'
import {
  DefaultGenericExecutor,
  WeiboSearchExecutor,
  WeiboPostExecutor,
  NLPAnalysisExecutor
} from './generic-executor'

// 导入新创建的微博执行器
import {
  WeiboKeywordSearchExecutor,
  WeiboAjaxStatusesShowExecutor,
  WeiboAjaxStatusesCommentExecutor,
  WeiboAjaxStatusesRepostTimelineExecutor,
  WeiboAjaxStatusesLikeShowExecutor,
  WeiboAjaxStatusesMymblogExecutor,
  WeiboAjaxProfileInfoExecutor,
  WeiboAjaxFriendshipsExecutor,
  WeiboAjaxFeedHotTimelineExecutor
} from './weibo-executors'

// 导入数据处理执行器
import {
  PostContextCollectorExecutor,
  PostNLPAnalyzerExecutor,
  EventAutoCreatorExecutor,
  BatchPushToMQExecutor
} from './data-processing-executors'

// 导入基础执行器
import {
  CodeExecutor,
  TestFormExecutor,
  WorkflowGraphExecutor,
  ArrayIteratorExecutor
} from './basic-executors'

/**
 * 初始化前端执行器系统
 *
 * 优雅设计：
 * - 注册所有前端执行器
 * - 初始化执行器查找器
 * - 提供统一的初始化接口
 */
export function initializeFrontendExecutors(): void {
  console.log('[FrontendExecutors] 开始初始化前端执行器系统')

  // 注册特殊执行器
  frontendExecutorRegistry.register(new WeiboLoginExecutor())
  frontendExecutorRegistry.register(new RealtimeStatusExecutor())

  // 注册微博API执行器
  frontendExecutorRegistry.register(new WeiboKeywordSearchExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxStatusesShowExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxStatusesCommentExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxStatusesRepostTimelineExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxStatusesLikeShowExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxStatusesMymblogExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxProfileInfoExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxFriendshipsExecutor())
  frontendExecutorRegistry.register(new WeiboAjaxFeedHotTimelineExecutor())

  // 注册数据处理执行器
  frontendExecutorRegistry.register(new PostContextCollectorExecutor())
  frontendExecutorRegistry.register(new PostNLPAnalyzerExecutor())
  frontendExecutorRegistry.register(new EventAutoCreatorExecutor())
  frontendExecutorRegistry.register(new BatchPushToMQExecutor())

  // 注册基础执行器
  frontendExecutorRegistry.register(new CodeExecutor())
  frontendExecutorRegistry.register(new TestFormExecutor())
  frontendExecutorRegistry.register(new WorkflowGraphExecutor())
  frontendExecutorRegistry.register(new ArrayIteratorExecutor())

  // 注册通用执行器（作为后备）
  frontendExecutorRegistry.register(new WeiboSearchExecutor())
  frontendExecutorRegistry.register(new WeiboPostExecutor())
  frontendExecutorRegistry.register(new NLPAnalysisExecutor())
  frontendExecutorRegistry.register(new DefaultGenericExecutor())

  // 初始化基于@Handler的执行器查找器
  ExecutorFinder.initialize()

  console.log('[FrontendExecutors] 前端执行器系统初始化完成，共注册', frontendExecutorRegistry.getExecutors().length, '个执行器')
}

/**
 * 获取执行器系统状态
 */
export function getExecutorSystemStatus() {
  const executors = frontendExecutorRegistry.getExecutors()

  return {
    totalExecutors: executors.length,
    executorNames: executors.map(e => e.getName()),
    initialized: true
  }
}