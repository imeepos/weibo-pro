/**
 * 千门八将 - 编程智能体系统
 *
 * 八将角色：
 * - 正(zheng): CodeAgent - 编码实现
 * - 提(ti): Orchestrator - 调度中枢
 * - 反(fan): Architect - 架构设计
 * - 脱(tuo): DeployAgent - 部署发布
 * - 风(feng): ScoutAgent - 代码审查
 * - 火(huo): GuardAgent - 测试防护
 * - 除(chu): FixerAgent - 问题修复
 * - 谣(yao): TechResearchAgent - 技术调研
 */

// 类型导出
export * from './types';

// 基类导出
export { BaseGeneral } from './BaseGeneral';

// 调度器（提将）
export { Orchestrator } from './Orchestrator';

// 七将导出
export { CodeAgent } from './CodeAgent';
export { Architect } from './Architect';
export { ScoutAgent } from './ScoutAgent';
export { GuardAgent } from './GuardAgent';
export { FixerAgent } from './FixerAgent';
export { DeployAgent } from './DeployAgent';
export { TechResearchAgent } from './TechResearchAgent';
export { WorkflowDSLGeneratorAgent } from './WorkflowDSLGeneratorAgent';

// 工具导出
export * from './tools';

// 便捷创建函数
import { Orchestrator } from './Orchestrator';
import { CodeAgent } from './CodeAgent';
import { Architect } from './Architect';
import { ScoutAgent } from './ScoutAgent';
import { GuardAgent } from './GuardAgent';
import { FixerAgent } from './FixerAgent';
import { DeployAgent } from './DeployAgent';
import { TechResearchAgent } from './TechResearchAgent';

/**
 * 创建完整的八将系统
 *
 * @example
 * ```ts
 * const generals = createEightGenerals();
 * const result = await generals.run('实现用户登录功能', '/path/to/project');
 * ```
 */
export function createEightGenerals(): Orchestrator {
  const orchestrator = new Orchestrator();

  orchestrator.registerAll([
    new CodeAgent(),
    new Architect(),
    new ScoutAgent(),
    new GuardAgent(),
    new FixerAgent(),
    new DeployAgent(),
    new TechResearchAgent(),
  ]);

  return orchestrator;
}
