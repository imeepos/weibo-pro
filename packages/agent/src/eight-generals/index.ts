/**
 * 千门八将 - 编程智能体系统
 *
 * 历史版本包含完整八将角色（Orchestrator + 7 个子 agent）与任务编排框架，
 * 但全仓仅 `@sker/api` 使用其中的 WorkflowDSLGeneratorAgent，其余均为死代码，
 * 已在去过度设计优化中移除。当前仅保留生产使用的部分。
 */

// 类型导出
export * from './types';

// 基类导出
export { BaseGeneral } from './BaseGeneral';

// DSL 生成智能体
export { WorkflowDSLGeneratorAgent } from './WorkflowDSLGeneratorAgent';
