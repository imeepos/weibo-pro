import { ExecutorFinder } from './executor-registry'
import { frontendExecutorRegistry } from './frontend-executor'
import { WeiboLoginExecutor, RealtimeStatusExecutor } from './special-executors'
import {
  DefaultGenericExecutor,
  WeiboSearchExecutor,
  WeiboPostExecutor,
  NLPAnalysisExecutor
} from './generic-executor'

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

  // 注册通用执行器
  frontendExecutorRegistry.register(new WeiboSearchExecutor())
  frontendExecutorRegistry.register(new WeiboPostExecutor())
  frontendExecutorRegistry.register(new NLPAnalysisExecutor())
  frontendExecutorRegistry.register(new DefaultGenericExecutor())

  // 初始化基于@Handler的执行器查找器
  ExecutorFinder.initialize()

  console.log('[FrontendExecutors] 前端执行器系统初始化完成')
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