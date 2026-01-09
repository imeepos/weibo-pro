/**
 * @sker/workflow-browser
 *
 * 浏览器端工作流执行器 - 前端运行时的 Visitor 实现层
 *
 * 架构设计：
 * - 默认使用 RemoteDefaultVisitor（远程代理执行），减轻客户端压力
 * - 所有节点默认通过 SSE 在后端执行，无需为每个节点编写前端 Visitor
 * - 通过 handlerRemote 实时同步后端执行状态和输出
 *
 * 使用方式：
 * 1. 在应用入口导入本包：import '@sker/workflow-browser'
 * 2. RemoteDefaultVisitor 自动注册为 DEFAULT_VISITOR
 * 3. 未找到 @Handler 的节点自动走远程执行
 */

import { root } from '@sker/core';
import { DEFAULT_VISITOR, EdgeModeStrategyProviders } from '@sker/workflow';
import { RemoteDefaultVisitor } from './RemoteDefaultVisitor.js';

// 自动注册 RemoteDefaultVisitor（前端默认使用远程代理执行）
// 同时注册 EdgeModeStrategy providers（前端也需要执行工作流）
root.set([
  {
    provide: DEFAULT_VISITOR,
    useClass: RemoteDefaultVisitor
  },
  ...EdgeModeStrategyProviders
]);

// 导出工具
export { RemoteDefaultVisitor } from './RemoteDefaultVisitor.js';
export { executeRemote, handlerRemote } from './execute-remote.js';
export { LastAstVisitor } from './LastAstVisitor.js'
export { PostNLPLooperAstVisitor } from './PostNLPLooperAstVisitor.js';
