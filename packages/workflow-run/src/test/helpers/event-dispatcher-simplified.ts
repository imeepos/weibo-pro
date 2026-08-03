/**
 * EventDispatcherAstVisitor 简化版本测试辅助
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 提供简化版本的 Mock 数据构建器与事件排序函数。
 */
import type { EventEntity, EventCategoryEntity } from '@sker/entities';

/**
 * 创建 Mock 分类
 */
export const createMockCategory = (id: string, name: string): EventCategoryEntity => ({
  id,
  code: name.toLowerCase(),
  name,
  name_en: name,
  description: `${name}类事件`,
  icon: 'test',
  color: '#000000',
  sort: 1,
  status: 'active' as const,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  deleted_at: null
});

/**
 * 创建 Mock 事件
 */
export const createMockEvent = (
  id: string,
  title: string,
  categoryId: string,
  lastCrawlAt: Date | null = null
): EventEntity => ({
  id,
  title,
  description: `${title}描述`,
  category_id: categoryId,
  sentiment: { positive: 0.5, negative: 0.3, neutral: 0.2 },
  hotness: 80.0,
  status: 'active' as const,
  seed_url: `https://example.com/${id}`,
  occurred_at: new Date('2024-01-15T10:00:00Z'),
  peak_at: new Date('2024-01-15T14:00:00Z'),
  keywords: ['test'],
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
  deleted_at: null,
  crawl_end_reason: null,
  last_crawl_at: lastCrawlAt,
  category: createMockCategory(categoryId, '测试分类')
});

/**
 * 按 last_crawl_at ASC NULLS FIRST 排序
 *
 * 规则：
 * - NULL（从未爬取）排最前面
 * - 已爬取的按 last_crawl_at 升序（最久未爬的排前面）
 * - last_crawl_at 相同或同为 NULL 时按 id 升序
 */
export const sortEventsByLastCrawlAt = (events: EventEntity[]): EventEntity[] => {
  return [...events].sort((a, b) => {
    if (a.last_crawl_at === null && b.last_crawl_at === null) {
      return a.id.localeCompare(b.id);
    }
    if (a.last_crawl_at === null) return -1;
    if (b.last_crawl_at === null) return 1;
    return a.last_crawl_at.getTime() - b.last_crawl_at.getTime();
  });
};
