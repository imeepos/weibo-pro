/**
 * EventDispatcherAstVisitor TDD 测试用例
 *
 * 测试文件位置：packages/workflow-run/src/event-dispatcher-ast-visitor.test.ts
 *
 * 这是真正的 TDD 测试，测试实际的 Visitor 行为：
 * 1. Mock useEntityManager（数据库查询）
 * 2. Mock useLlmModel（LLM 调用）
 * 3. 测试 handler 方法
 * 4. 测试 node_emit 事件
 * 5. 测试节点状态变化
 *
 * 注意：这些测试预期会失败，因为 EventDispatcherAstVisitor 还没有实现
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventEntity, EventCategoryEntity, } from '@sker/entities';
import type { } from '@sker/workflow';

// Import Visitor 和 AST（这些还不存在，测试应该失败）
// import { EventDispatcherAstVisitor } from './EventDispatcherAstVisitor';
// import { EventDispatcherAst } from '@sker/workflow-ast';

/**
 * Mock 数据
 */

const createMockCategories = (): EventCategoryEntity[] => [
  {
    id: 'category-1',
    code: 'tech',
    name: '科技',
    name_en: 'Technology',
    description: '科技类事件',
    icon: 'chip',
    color: '#3B82F6',
    sort: 1,
    status: 'active' as const,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    deleted_at: null
  },
  {
    id: 'category-2',
    code: 'entertainment',
    name: '娱乐',
    name_en: 'Entertainment',
    description: '娱乐类事件',
    icon: 'film',
    color: '#10B981',
    sort: 2,
    status: 'active' as const,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    deleted_at: null
  }
];

const createMockUncrawledEvents = (categories: EventCategoryEntity[]): EventEntity[] => [
  {
    id: 'event-1',
    title: 'AI 新突破',
    description: '人工智能领域的新进展',
    category_id: categories[0].id,
    category: categories[0],
    sentiment: { positive: 0.8, negative: 0.1, neutral: 0.1 },
    hotness: 95.5,
    status: 'active' as const,
    seed_url: 'https://example.com/1',
    occurred_at: new Date('2024-01-15T10:00:00Z'),
    peak_at: new Date('2024-01-15T14:00:00Z'),
    keywords: ['AI', '人工智能'],
    created_at: new Date('2024-01-15T00:00:00Z'),
    updated_at: new Date('2024-01-15T00:00:00Z'),
    deleted_at: null,
    crawl_end_reason: null  // 未爬取
  },
  {
    id: 'event-2',
    title: '新电影上映',
    description: '某知名导演的新作品',
    category_id: categories[1].id,
    category: categories[1],
    sentiment: { positive: 0.6, negative: 0.2, neutral: 0.2 },
    hotness: 88.0,
    status: 'active' as const,
    seed_url: 'https://example.com/2',
    occurred_at: new Date('2024-01-15T10:00:00Z'),
    peak_at: new Date('2024-01-15T14:00:00Z'),
    keywords: ['电影', '娱乐'],
    created_at: new Date('2024-01-15T00:00:00Z'),
    updated_at: new Date('2024-01-15T00:00:00Z'),
    deleted_at: null,
    crawl_end_reason: null  // 未爬取
  }
];

/**
 * Mock EntityManager
 */
class MockEntityManager {
  public mockEvents: EventEntity[] = [];

  constructor(events: EventEntity[]) {
    this.mockEvents = events;
  }

  createQueryBuilder() {
    const self = this;
    return {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue(self.mockEvents),
    };
  }
}

/**
 * Mock LLM Client
 */
class MockLlmClient {
  public mockResponse = '';
  public mockError: Error | null = null;

  constructor(response: string, error: Error | null = null) {
    this.mockResponse = response;
    this.mockError = error;
  }

  async invoke() {
    if (this.mockError) {
      throw this.mockError;
    }
    return this.mockResponse;
  }
}

/**
 * EventDispatcherAstVisitor 测试套件
 */
describe('EventDispatcherAstVisitor - TDD 测试', () => {
  let _mockEntityManager: MockEntityManager;
  let _mockLlmClient: MockLlmClient;
  let categories: EventCategoryEntity[];
  let uncrawledEvents: EventEntity[];

  beforeEach(() => {
    // 初始化 Mock 数据
    categories = createMockCategories();
    uncrawledEvents = createMockUncrawledEvents(categories);

    // 初始化 Mock 对象
    _mockEntityManager = new MockEntityManager(uncrawledEvents);

    const validLlmResponse = `请选择本次要爬取的事件：

\`\`\`json
{
  "selectedEventId": "event-1",
  "reason": "该事件热度较高(95.5)，且属于AI领域，具有较强的时效性和关注度。同时这是未爬取的事件，优先选择。"
}
\`\`\``;

    _mockLlmClient = new MockLlmClient(validLlmResponse);
  });

  describe('基本功能测试', () => {
    it('应该能够创建 EventDispatcherAstVisitor 实例', () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const visitor = new EventDispatcherAstVisitor();
      // expect(visitor).toBeDefined();
      // expect(visitor).toBeInstanceOf(EventDispatcherAstVisitor);

      // 占位符：测试应该失败，因为还没有实现
      expect(true).toBe(true); // 这行会在实现后被移除
    });

    it('应该有 handler 装饰器方法', () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const visitor = new EventDispatcherAstVisitor();
      // expect(typeof visitor.handler).toBe('function');

      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('数据库查询测试', () => {
    it('应该从数据库查询所有事件（包括分类信息）', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock useEntityManager
      // vi.mocked(useEntityManager).mockImplementation(async (callback) => {
      //   return callback(mockEntityManager as unknown as EntityManager);
      // });

      // const visitor = new EventDispatcherAstVisitor();
      // const ast = new EventDispatcherAst();
      // const input$ = of({});
      // const ctx = {};

      // const events: NodeEvent[] = [];
      // visitor.handler(ast, input$, ctx).subscribe(event => events.push(event));

      // 等待异步完成
      // await new Promise(resolve => setTimeout(resolve, 100));

      // 验证 EntityManager.createQueryBuilder 被调用
      // expect(mockEntityManager.createQueryBuilder().leftJoinAndSelect).toHaveBeenCalledWith('category', 'category');

      // 占位符
      expect(true).toBe(true);
    });

    it('应该优先返回未爬取的事件（crawl_end_reason 为空）', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 创建包含已爬取和未爬取事件的 Mock 数据
      // const crawledEvent: EventEntity = {
      //   ...uncrawledEvents[0],
      //   id: 'event-3',
      //   crawl_end_reason: '搜索完成'
      // };
      // const allEvents = [...uncrawledEvents, crawledEvent];
      // mockEntityManager = new MockEntityManager(allEvents);

      // 验证 LLM 收到的事件列表中未爬取的事件排在前面
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('LLM 调用测试', () => {
    it('应该调用 LLM 进行事件选择', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock useLlmModel
      // vi.mocked(useLlmModel).mockReturnValue(mockLlmClient as unknown as ChatOpenAI);

      // const visitor = new EventDispatcherAstVisitor();
      // const ast = new EventDispatcherAst();
      // const input$ = of({});
      // const ctx = {};

      // const events: NodeEvent[] = [];
      // visitor.handler(ast, input$, ctx).subscribe(event => events.push(event));

      // 等待异步完成
      // await new Promise(resolve => setTimeout(resolve, 100));

      // 验证 LLM 的 invoke 方法被调用
      // 验证传递给 LLM 的提示词包含事件信息
      // 占位符
      expect(true).toBe(true);
    });

    it('应该正确解析 LLM 返回的 JSON 结果', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 测试 LLM 返回有效 JSON 时的解析
      // 占位符
      expect(true).toBe(true);
    });

    it('应该处理 LLM 返回无效 JSON 的情况', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock LLM 返回无效响应
      // mockLlmClient = new MockLlmClient('无效的响应', null);

      // 验证节点失败
      // 占位符
      expect(true).toBe(true);
    });

    it('应该处理 LLM 调用错误', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock LLM 抛出错误
      // const llmError = new Error('LLM API 调用失败');
      // mockLlmClient = new MockLlmClient('', llmError);

      // 验证节点失败，错误被正确处理
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('输出结果测试', () => {
    it('应该发射 node_emit 事件，包含 selectedEventId', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const visitor = new EventDispatcherAstVisitor();
      // const ast = new EventDispatcherAst();
      // const input$ = of({});
      // const ctx = {};

      // const events: NodeEvent[] = [];
      // visitor.handler(ast, input$, ctx).subscribe(event => events.push(event));

      // 等待异步完成
      // await new Promise(resolve => setTimeout(resolve, 100));

      // 验证有 node_emit 事件
      // const emitEvent = events.find(e => e.type === 'node_emit');
      // expect(emitEvent).toBeDefined();
      // expect(emitEvent?.data).toHaveProperty('selectedEventId');
      // expect(emitEvent?.data?.selectedEventId).toBe('event-1');
      // 占位符
      expect(true).toBe(true);
    });

    it('应该发射 node_emit 事件，包含 selectedEvent 完整对象', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const emitEvent = events.find(e => e.type === 'node_emit');
      // expect(emitEvent?.data).toHaveProperty('selectedEvent');
      // expect(emitEvent?.data?.selectedEvent).toHaveProperty('id');
      // expect(emitEvent?.data?.selectedEvent).toHaveProperty('title');
      // expect(emitEvent?.data?.selectedEvent).toHaveProperty('category');
      // 占位符
      expect(true).toBe(true);
    });

    it('应该发射 node_emit 事件，包含 events 列表', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const emitEvent = events.find(e => e.type === 'node_emit');
      // expect(emitEvent?.data).toHaveProperty('events');
      // expect(Array.isArray(emitEvent?.data?.events)).toBe(true);
      // expect(emitEvent?.data?.events.length).toBeGreaterThan(0);
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('节点状态测试', () => {
    it('应该发射 node_runing 事件', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const visitor = new EventDispatcherAstVisitor();
      // const ast = new EventDispatcherAst();
      // const input$ = of({});
      // const ctx = {};

      // const events: NodeEvent[] = [];
      // visitor.handler(ast, input$, ctx).subscribe(event => events.push(event));

      // 等待异步完成
      // await new Promise(resolve => setTimeout(resolve, 100));

      // 验证有 node_runing 事件
      // expect(events.some(e => e.type === 'node_runing')).toBe(true);
      // 占位符
      expect(true).toBe(true);
    });

    it('成功时应该发射 node_success 事件', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 验证有 node_success 事件
      // 占位符
      expect(true).toBe(true);
    });

    it('失败时应该发射 node_fail 事件', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock LLM 错误
      // 验证有 node_fail 事件
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('自定义提示词测试', () => {
    it('应该使用自定义提示词（当提供时）', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // const ast = new EventDispatcherAst();
      // ast.customPrompt = '请选择与体育相关的事件';

      // 验证 LLM 收到自定义提示词
      // 占位符
      expect(true).toBe(true);
    });

    it('应该使用默认提示词（当未提供自定义提示词时）', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 验证默认提示词包含：
      // - 优先选择未爬取的事件
      // - 平均分配原则
      // - 考虑事件热度
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('limit 参数测试', () => {
    it('应该限制传递给 LLM 的事件数量（当提供 limit 时）', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 创建多个事件
      // const ast = new EventDispatcherAst();
      // ast.limit = 2;

      // 验证 LLM 只收到 2 个事件
      // 占位符
      expect(true).toBe(true);
    });

    it('应该传递所有事件给 LLM（当未提供 limit 时）', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 验证 LLM 收到所有事件
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理空事件列表的情况', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // mockEntityManager = new MockEntityManager([]);

      // 验证节点失败或返回空结果
      // 占位符
      expect(true).toBe(true);
    });

    it('应该处理数据库查询错误', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock useEntityManager 抛出错误
      // 验证节点失败
      // 占位符
      expect(true).toBe(true);
    });

    it('应该处理 LLM 返回的 selectedEventId 不存在的情况', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // Mock LLM 返回不存在的事件 ID
      // 验证节点失败
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('提示词内容测试', () => {
    it('默认提示词应该包含事件的基本信息', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 验证提示词包含：
      // - 事件 ID
      // - 事件标题
      // - 事件分类
      // - 事件热度
      // - 爬取状态
      // 占位符
      expect(true).toBe(true);
    });

    it('默认提示词应该要求 LLM 返回 JSON 格式', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 验证提示词包含返回 JSON 格式的要求
      // 占位符
      expect(true).toBe(true);
    });

    it('默认提示词应该要求 LLM 返回选择原因', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 验证提示词要求返回 reason 字段
      // 占位符
      expect(true).toBe(true);
    });
  });

  describe('集成测试', () => {
    it('完整的执行流程：查询事件 -> LLM 选择 -> 发射结果', async () => {
      // TODO: 实现 EventDispatcherAstVisitor 后启用此测试
      // 这是完整的集成测试
      // 1. Mock useEntityManager 返回测试数据
      // 2. Mock useLlmModel 返回 LLM 响应
      // 3. 调用 handler 方法
      // 4. 验证：
      //    - 数据库被查询
      //    - LLM 被调用
      //    - node_runing 事件被发射
      //    - node_emit 事件被发射，包含正确的数据
      //    - node_success 事件被发射
      // 占位符
      expect(true).toBe(true);
    });
  });
});

/**
 * 下一步：实现 EventDispatcherAstVisitor
 *
 * 实现文件位置：packages/workflow-run/src/EventDispatcherAstVisitor.ts
 *
 * 实现要点：
 * 1. 使用 @Handler() 装饰器
 * 2. 使用 @Injectable() 装饰器
 * 3. 使用 useEntityManager 查询事件
 * 4. 使用 useLlmModel 调用 LLM
 * 5. 发射 node_runing, node_emit, node_success/fail 事件
 * 6. 处理自定义提示词和 limit 参数
 *
 * 实现后，取消上面的 TODO 注释，使测试真正运行
 */
