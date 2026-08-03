/**
 * workflow 链路集成测试（docs/testing-plan.md §5.1）— DSL → 引擎 → AST → Visitor 完整链路
 *
 * 原则：
 * - 不真实调用外部服务（LLM / DB / 网络）：全部 mock
 * - 显式 import vitest 的 describe / it / expect / vi
 */
import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { compile } from '@sker/workflow-compiler';
import {
  executeWorkflow,
  WorkflowGraphAst,
  type NodeEvent,
} from '@sker/workflow';
import {
  WeiboLoginAst,
  LastAst,
} from '@sker/workflow-ast';
import { root } from '@sker/core';

import { WeiboAuthService } from '../services/weibo-auth.service';
import { createMockAuthService, collectEvents } from '../test/helpers/workflow-link-test-utils';
// 副作用导入：按 index 顺序加载全部 visitor，注册 @Handler(WeiboLoginAst) 与
// @Handler(LastAst)，让引擎把对应节点分派到真实 workflow-run visitor，
// 而非 DefaultVisitor。直接导入单个 visitor 会因模块求值顺序问题漏注册。
import '../index';

// ---------------------------------------------------------------------------
// Mock @sker/entities 的 useEntityManager：避免真实实体模块在导入时向 root
// 容器注册副作用，保证 WeiboAuthService 的 mock 覆盖在链路中生效。
// ---------------------------------------------------------------------------
vi.mock('@sker/entities', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const mockManager = {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(null),
    query: vi.fn().mockResolvedValue([]),
    createQueryBuilder: () => ({
      leftJoinAndSelect: () => ({} as never),
      where: () => ({} as never),
      andWhere: () => ({} as never),
      orderBy: () => ({} as never),
      getMany: vi.fn().mockResolvedValue([]),
    }),
  };
  return {
    ...actual,
    useEntityManager: vi.fn((cb: (m: typeof mockManager) => Promise<unknown>) =>
      Promise.resolve(cb(mockManager)),
    ),
  };
});

// ---------------------------------------------------------------------------
// 链路一：完整链路 workflow-compiler → workflow 引擎 → workflow-ast 节点 → workflow-run
// ---------------------------------------------------------------------------
describe('workflow 链路集成：DSL → 引擎 → AST → Visitor', () => {
  it('compile DSL 产出真实 WorkflowGraphAst 与 AST 实例', () => {
    const dsl = `
      workflow "微博登录链路" {
        node login {
          type: WeiboLoginAst
        }
        node last {
          type: LastAst
        }
        login.message -> last.input
      }
    `;

    const result = compile(dsl);

    expect(result.success).toBe(true);
    expect(result.workflowGraph).toBeDefined();
    const workflow = result.workflowGraph!;

    // DSL 编译器产出的是一张真实 WorkflowGraphAst
    expect(workflow).toBeInstanceOf(WorkflowGraphAst);
    expect(workflow.name).toBe('微博登录链路');
    expect(workflow.nodes).toHaveLength(2);
    // 节点是 workflow-ast 的真实 AST 类实例
    expect(workflow.nodes[0]).toBeInstanceOf(WeiboLoginAst);
    expect(workflow.nodes[1]).toBeInstanceOf(LastAst);
    // 边正确生成
    expect(workflow.edges).toHaveLength(1);
    expect(workflow.edges[0]).toMatchObject({
      fromProperty: 'message',
      toProperty: 'input',
    });
  });

  it('executeWorkflow 将 AST 节点分发到 workflow-run 的 visitor 并产生预期事件', async () => {
    const mockAuthService = createMockAuthService();
    // 注册 mock 服务（覆盖 root 中真实 WeiboAuthService 提供者）
    root.set([{ provide: WeiboAuthService, useValue: mockAuthService }]);

    const dsl = `
      workflow "微博登录链路" {
        node login {
          type: WeiboLoginAst
        }
        node last {
          type: LastAst
        }
        login.message -> last.input
      }
    `;
    const result = compile(dsl);
    expect(result.success).toBe(true);
    const workflow = result.workflowGraph!;

    const events = await collectEvents(executeWorkflow(workflow, {}));

    // 1. 引擎正确分派到 WeiboLoginAstVisitor → mock 的 startLogin 被调用且收到对应节点
    expect(mockAuthService.startLogin).toHaveBeenCalledTimes(1);
    const receivedAst = mockAuthService.startLogin.mock.calls[0][0] as WeiboLoginAst;
    // 引擎会对节点做结构化克隆（cloneNode），因此断言类型与 id，而非实例身份
    expect(receivedAst.type).toBe('WeiboLoginAst');
    expect(receivedAst.id).toBe(workflow.nodes[0].id);

    // 2. 事件流包含 runing / emit / success
    const types = events.map((e) => e.type);
    expect(types).toContain('node_runing');
    expect(types).toContain('node_emit');
    expect(types).toContain('node_success');

    // 3. 下游 LastAstVisitor 收到 login.message 的值（边数据流贯通）
    const lastEmit = events.find(
      (e) => e.type === 'node_emit' && 'last' in (e.data ?? {}) && (e.data as { last?: unknown }).last === '登录成功',
    );
    expect(lastEmit).toBeDefined();

    // 4. 工作流最终成功；下游节点也成功（引擎对子节点克隆执行，故通过事件断言）
    expect(workflow.state).toBe('success');
    const lastSuccess = events.find(
      (e) => e.type === 'node_success' && e.id === workflow.nodes[1].id,
    );
    expect(lastSuccess).toBeDefined();
  });
});
