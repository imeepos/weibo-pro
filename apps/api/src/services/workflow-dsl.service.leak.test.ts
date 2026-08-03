import { describe, it, expect, vi, beforeEach } from 'vitest';
import { root } from '@sker/core';

// 关键：mock @sker/agent，使 WorkflowDSLGeneratorAgent 可计数，避免拉起重型 LangChain 依赖
vi.mock('@sker/agent', () => {
  return {
    WorkflowDSLGeneratorAgent: vi.fn(),
  };
});

import { WorkflowDSLGeneratorAgent } from '@sker/agent';
import { WorkflowDSLService } from './workflow-dsl.service';
import { WorkflowDSLController } from '../controllers/workflow-dsl.controller';

/**
 * 泄漏背景（2026-08-03 审计实证）：
 * controller.factory.ts:76-80 对每个请求新建 feature injector 并 reqInjector.get(ControllerClass)，
 * 而 WorkflowDSLController 构造器直接 new WorkflowDSLService()，其构造器又 new WorkflowDSLGeneratorAgent()
 * （内部创建 ChatOpenAI 等重型对象）+ setInterval 且永不 clearInterval。
 * → 每个 DSL 请求泄漏一个 agent + 一个定时器。
 *
 * 修复目标：WorkflowDSLService 成为 root 单例，controller 经 root.get 复用，
 * 使整个进程只构造一次 WorkflowDSLGeneratorAgent。
 */
describe('WorkflowDSLService 单例修复（防每请求泄漏）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('多次实例化 controller / 多次获取服务，WorkflowDSLGeneratorAgent 仅构造一次', () => {
    // 模拟 controller.factory 每请求实例化 controller
    new WorkflowDSLController();
    new WorkflowDSLController();

    const svc1 = root.get(WorkflowDSLService);
    const svc2 = root.get(WorkflowDSLService);

    expect(svc1).toBe(svc2);
    expect(WorkflowDSLGeneratorAgent).toHaveBeenCalledTimes(1);
  });
});
