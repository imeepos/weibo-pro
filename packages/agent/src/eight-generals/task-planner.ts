import type {
  GeneralRole,
  AgentTask,
  TaskType,
} from './types';
import { createTask } from './types';

/**
 * 分类任务类型
 */
export function classifyTask(request: string): TaskType {
  if (/实现|编写|创建|添加|开发/.test(request)) return 'code';
  if (/设计|架构|方案|规划/.test(request)) return 'architecture';
  if (/部署|发布|CI|CD|上线/.test(request)) return 'deploy';
  if (/审查|review|检查|扫描/.test(request)) return 'review';
  if (/测试|test|安全/.test(request)) return 'test';
  if (/修复|fix|bug|调试|debug/.test(request)) return 'fix';
  if (/调研|文档|分析|研究/.test(request)) return 'research';
  return 'general';
}

/**
 * 从调度 Agent 结果解析任务
 */
export function parseTasksFromResult(result: any): AgentTask[] {
  const tasks: AgentTask[] = [];

  // 遍历消息，提取工具调用创建的任务
  for (const msg of result.messages || []) {
    if (msg.tool_calls) {
      for (const call of msg.tool_calls) {
        if (call.name === 'create_task' && call.args) {
          const task = createTask({
            type: call.args.type || 'general',
            description: call.args.description,
            assignedTo: call.args.assignedTo,
            priority: call.args.priority,
            dependencies: call.args.dependencies,
          });
          tasks.push(task);
        }
      }
    }
  }

  // 如果没有解析到任务，创建一个默认任务
  if (tasks.length === 0) {
    const lastMessage = result.messages?.[result.messages.length - 1];
    tasks.push(
      createTask({
        type: 'general',
        description: lastMessage?.content || '执行用户请求',
        assignedTo: 'zheng',
      })
    );
  }

  return tasks;
}

/**
 * 构建规划器提示词
 */
export function buildPlannerPrompt(
  agents: Iterable<[GeneralRole, { name: string; description: string }]>
): string {
  const agentList = Array.from(agents)
    .map(([role, g]) => `- ${role}(${g.name}): ${g.description}`)
    .join('\n');

  return `你是"提将"，千门八将的中枢调度者。

## 可用智能体
${agentList || '暂无注册的智能体'}

## 角色职责
- zheng(正将): 代码编写、功能实现
- fan(反将): 系统设计、架构决策
- tuo(脱将): 部署发布、版本管理
- feng(风将): 代码审查、漏洞扫描
- huo(火将): 测试验证、安全防护
- chu(除将): Debug调试、故障修复
- yao(谣将): 技术调研、文档生成

## 任务分配工具
使用 create_task 工具创建任务，设置：
- type: 任务类型
- description: 任务描述
- assignedTo: 分配的智能体角色
- priority: 优先级
- dependencies: 依赖的任务ID（可选）

## 工作流程
1. 分析用户请求，识别需要的能力
2. 拆解为具体子任务
3. 为每个子任务选择合适的智能体
4. 设置任务间的依赖关系
5. 调用 create_task 创建所有任务

## 输出要求
- 必须调用 create_task 工具创建任务
- 复杂任务要拆解，简单任务直接分配
- 注意设置合理的依赖关系`;
}
