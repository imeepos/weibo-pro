/**
 * workflow 链路集成测试（docs/testing-plan.md §5.1）
 *
 * 覆盖两条链路：
 * 1. workflow-compiler DSL → workflow 引擎 → workflow-ast 节点 → workflow-run 执行（完整链路）
 * 2. 微博登录 / 微博搜索节点：AST 定义 ↔ Visitor 执行一致
 *
 * 原则：
 * - 不真实调用外部服务（LLM / DB / 网络）：全部 mock
 * - 显式 import vitest 的 describe / it / expect / vi
 */
import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { of, type Subscriber } from 'rxjs';
import { compile } from '@sker/workflow-compiler';
import {
  executeWorkflow,
  Compiler,
  WorkflowGraphAst,
  type NodeEvent,
} from '@sker/workflow';
import {
  WeiboLoginAst,
  WeiboKeywordSearchAst,
  LastAst,
} from '@sker/workflow-ast';
import { root } from '@sker/core';

import { WeiboLoginAstVisitor } from '../WeiboLoginAstVisitor';
import { WeiboKeywordSearchAstVisitor } from '../WeiboKeywordSearchAstVisitor';
import { WeiboAuthService } from '../services/weibo-auth.service';
// 副作用导入：注册 LastAstVisitor 的 @Handler(LastAst)，让引擎把 LastAst
// 分派到真实 workflow-run visitor，而非 DefaultVisitor。
import '../LastAstVisitor';

// ---------------------------------------------------------------------------
// Mock @sker/entities 的 useEntityManager：
// WeiboKeywordSearchAstVisitor 内部通过 useEntityManager 访问数据库，
// 这里 mock 掉真实连接，仅返回“无已存在帖子”，避免真实 DB 调用。
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
// 微博登录 mock：WeiboLoginAstVisitor 依赖 WeiboAuthService.startLogin。
// 用 mock 替换 root 容器中的 WeiboAuthService，保证链路上真实分派到
// WeiboLoginAstVisitor，但不会触发 Playwright / 真实登录。
// ---------------------------------------------------------------------------
function createMockAuthService() {
  return {
    startLogin: vi.fn((ast: WeiboLoginAst, obs: Subscriber<NodeEvent>) => {
      obs.next({
        type: 'node_emit',
        id: ast.id,
        data: { qrcode: 'https://weibo.com/qrcode/mock', message: '请扫码登录' },
      });
      ast.account = { id: 'mock-account', nickname: '测试账号' } as never;
      obs.next({
        type: 'node_emit',
        id: ast.id,
        data: { account: ast.account, message: '登录成功' },
      });
      ast.state = 'success';
      obs.next({ type: 'node_success', id: ast.id });
      obs.complete();
    }),
    cancelSession: vi.fn(),
  };
}

/** 收集 Observable 事件并带上超时保护 */
function collectEvents(source: ReturnType<typeof executeWorkflow>, timeoutMs = 8000) {
  return new Promise<NodeEvent[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`链路执行超时（${timeoutMs}ms）`)), timeoutMs);
    const events: NodeEvent[] = [];
    source.subscribe({
      next: (event) => events.push(event),
      error: (err) => {
        clearTimeout(timer);
        reject(err);
      },
      complete: () => {
        clearTimeout(timer);
        resolve(events);
      },
    });
  });
}

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

// ---------------------------------------------------------------------------
// 链路二：微博登录节点 AST 定义 ↔ Visitor 执行一致
// ---------------------------------------------------------------------------
describe('微博登录节点：AST 定义 ↔ Visitor 执行一致', () => {
  it('WeiboLoginAstVisitor 输出事件与 AST 的 @Output 端口定义一致', async () => {
    const authService = createMockAuthService();
    const visitor = new WeiboLoginAstVisitor(authService as never);

    const ast = new WeiboLoginAst();
    ast.name = 'weibo-login-1';

    // 编译 AST 拿到输出端口元数据（@Output 定义）
    new Compiler().compile(ast);
    const outputProps = (ast.metadata?.outputs ?? []).map((o) => String(o.property));
    expect(outputProps).toEqual(expect.arrayContaining(['account', 'qrcode', 'message']));

    const events = await collectEvents(
      visitor.handler(ast, of({}), {} as never) as ReturnType<typeof executeWorkflow>,
    );

    // 1. Visitor 收到的是同一个 AST 实例（定义 ↔ 执行一致性）
    expect(authService.startLogin).toHaveBeenCalledTimes(1);
    expect(authService.startLogin.mock.calls[0][0]).toBe(ast);

    // 2. 事件生命周期完整
    const types = events.map((e) => e.type);
    expect(types).toContain('node_runing');
    expect(types).toContain('node_success');

    // 3. node_emit 的 payload 数据键（排除 emitCount 内部计数）来自 AST 输出端口
    const emitData = events
      .filter((e) => e.type === 'node_emit')
      .flatMap((e) => Object.keys((e as { data: Record<string, unknown> }).data))
      .filter((key) => key !== 'emitCount');
    for (const key of emitData) {
      expect(outputProps).toContain(key);
    }
    const allData = Object.assign(
      {},
      ...events
        .filter((e) => e.type === 'node_emit')
        .map((e) => (e as { data: Record<string, unknown> }).data),
    );
    expect(allData.qrcode).toBe('https://weibo.com/qrcode/mock');
    expect(allData.message).toBe('登录成功');
    expect(ast.account).toEqual({ id: 'mock-account', nickname: '测试账号' });
    expect(ast.state).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// 链路二：微博搜索节点 AST 定义 ↔ Visitor 执行一致
// ---------------------------------------------------------------------------
describe('微博搜索节点：AST 定义 ↔ Visitor 执行一致', () => {
  it('WeiboKeywordSearchAstVisitor 依据 AST 构建 HTTP 请求，发射结果对应 AST 输出端口', async () => {
    const account = {
      selectBestAccount: vi.fn().mockResolvedValue({ id: 'acc-1', cookieHeader: 'SINAGLOBAL=1; SUB=abc' }),
      markAccountAsExpired: vi.fn(),
    };
    const parser = {
      parseSearchResultHtml: vi.fn().mockReturnValue({
        posts: [
          { mid: 'm100', uid: 'u200' },
          { mid: 'm101', uid: 'u201' },
        ],
        hasNextPage: false,
        nextPageLink: undefined,
        isEmptyResult: false,
        currentPage: 1,
        totalPage: 1,
        totalCount: undefined,
        lastPostTime: undefined,
      }),
    };
    const playwright = { getHtml: vi.fn().mockResolvedValue('<html>mock-html</html>') };
    const workerBrowser = { getHtml: vi.fn().mockResolvedValue('<html>mock-html</html>') };
    const delayService = { randomDelay: vi.fn().mockResolvedValue(undefined) };

    const visitor = new WeiboKeywordSearchAstVisitor(
      parser as never,
      playwright as never,
      workerBrowser as never,
      account as never,
      delayService as never,
    );

    const ast = new WeiboKeywordSearchAst();
    ast.keyword = '人工智能';
    ast.startDate = new Date('2026-01-01T00:00:00+08:00');
    ast.endDate = new Date('2026-01-31T23:00:00+08:00');

    // 编译 AST 拿到输出端口元数据（@Output 定义）
    new Compiler().compile(ast);
    const outputProps = (ast.metadata?.outputs ?? []).map((o) => String(o.property));
    expect(outputProps).toEqual(expect.arrayContaining(['mblogid', 'uid']));

    const events = await collectEvents(
      visitor.handler(ast, of({}), {} as never) as ReturnType<typeof executeWorkflow>,
    );

    // 1. 依据 AST 定义构建的 HTTP 请求 URL 正确
    const url = playwright.getHtml.mock.calls[0][0] as string;
    expect(url).toContain('https://s.weibo.com/weibo');
    expect(url).toContain(`q=${encodeURIComponent('人工智能')}`);
    // URLSearchParams 会编码冒号，因此对 URL 解码后再断言 timescope
    expect(decodeURIComponent(url)).toContain('timescope=custom:2026-01-01-00:2026-01-31-23');
    // 携带账号 Cookie（来自 account service mock）
    expect(playwright.getHtml.mock.calls[0][1]).toBe('SINAGLOBAL=1; SUB=abc');

    // 2. 发射的 node_emit 数据对应 AST 输出端口 mblogid / uid，且与解析结果一致
    const emits = events.filter((e) => e.type === 'node_emit');
    const postEmits = emits.filter((e) => 'mblogid' in (e.data ?? {}));
    expect(postEmits).toHaveLength(2);
    expect((postEmits[0].data as { mblogid: string; uid: string })).toEqual({
      mblogid: 'm100',
      uid: 'u200',
    });
    expect((postEmits[1].data as { mblogid: string; uid: string })).toEqual({
      mblogid: 'm101',
      uid: 'u201',
    });

    // 3. 执行结果回写到 AST 自身（visitor 会更新 ast.mblogid / ast.uid）
    expect(ast.mblogid).toBe('m101');
    expect(ast.uid).toBe('u201');
    expect(ast.state).toBe('success');

    // 4. 生命周期事件完整
    const types = events.map((e) => e.type);
    expect(types).toContain('node_runing');
    expect(types).toContain('node_success');
  });
});
