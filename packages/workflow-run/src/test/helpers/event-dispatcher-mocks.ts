/**
 * EventDispatcherAstVisitor 测试用 Mock 数据与 Mock 客户端
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 包含：Mock 分类/事件数据、Mock EntityManager、Mock LLM Client。
 */
import { vi } from 'vitest';
import type { EventEntity, EventCategoryEntity } from '@sker/entities';

/**
 * Mock 分类数据
 */
export const createMockCategories = (): EventCategoryEntity[] => [
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

/**
 * Mock 未爬取事件数据
 */
export const createMockUncrawledEvents = (categories: EventCategoryEntity[]): EventEntity[] => [
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
export class MockEntityManager {
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
export class MockLlmClient {
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
 * 有效的 LLM 响应（选择 event-1）
 */
export const createValidLlmResponse = (): string => `请选择本次要爬取的事件：

\`\`\`json
{
  "selectedEventId": "event-1",
  "reason": "该事件热度较高(95.5)，且属于AI领域，具有较强的时效性和关注度。同时这是未爬取的事件，优先选择。"
}
\`\`\``;
