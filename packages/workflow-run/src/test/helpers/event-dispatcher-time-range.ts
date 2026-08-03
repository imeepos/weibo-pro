/**
 * EventDispatcherAstVisitor 时间范围功能测试辅助
 *
 * 说明：
 * - 该文件位于 src/test/ 目录下，被 tsconfig 排除（不参与类型检查），
 *   仅作为 vitest 测试辅助文件被测试用例导入使用。
 * - 提供时间差值计算、指标计算、提示词格式化与 Mock 事件构建器。
 */
import { EventEntity, EventCategoryEntity } from '@sker/entities';

/**
 * 时间范围接口
 */
export interface TimeRange {
  min: string;
  max: string;
}

/**
 * 计算两个日期之间的天数差
 */
export function calculateDaysDiff(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 格式化天数为可读字符串
 */
export function formatDays(days: number): string {
  if (days < 1) return `${Math.floor(days * 24)}小时`;
  if (days < 30) return `${days}天`;
  return `${(days / 30).toFixed(1)}月`;
}

/**
 * 计算事件的时间差值和覆盖率
 */
export function calculateEventMetrics(
  eventStartTime: Date,
  currentTime: Date,
  postMinTime: Date | null,
  postMaxTime: Date | null
) {
  const totalDays = calculateDaysDiff(eventStartTime, currentTime);
  let crawledDays = 0;
  let gapDays = totalDays;
  let coveragePercent = 0;

  if (postMinTime && postMaxTime) {
    crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
    const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
    const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
    gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
    coveragePercent = Math.round((crawledDays / totalDays) * 100);
  }

  return { totalDays, crawledDays, gapDays, coveragePercent };
}

/**
 * 格式化单个事件信息（含时间指标）
 */
export function formatEventWithMetrics(
  event: EventEntity,
  timeRangeMap: Map<string, TimeRange>,
  currentTime: Date,
  idx: number
): string {
  const crawlStatus = event.crawl_end_reason ? `已爬取(${event.crawl_end_reason})` : '未爬取';
  const timeRangeInfo = timeRangeMap.get(event.id);

  const eventStartTime = event.occurred_at || event.created_at;
  const totalDays = calculateDaysDiff(eventStartTime, currentTime);

  let crawledDays = 0;
  let gapDays = totalDays;
  let coveragePercent = 0;

  if (timeRangeInfo) {
    const postMinTime = new Date(timeRangeInfo.min);
    const postMaxTime = new Date(timeRangeInfo.max);
    crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
    const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
    const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
    gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
    coveragePercent = Math.round((crawledDays / totalDays) * 100);
  }

  const updatedDaysAgo = calculateDaysDiff(event.updated_at, currentTime);

  return `${idx + 1}. ID: ${event.id}
   标题: ${event.title}
   分类: ${event.category?.name || '未分类'}
   状态: ${crawlStatus}
   总时间跨度: ${formatDays(totalDays)} (${eventStartTime.toISOString().split('T')[0]} ~ ${currentTime.toISOString().split('T')[0]})
   已爬取: ${timeRangeInfo ? `${formatDays(crawledDays)} (${coveragePercent}%) [${timeRangeInfo.min.split('T')[0]} ~ ${timeRangeInfo.max.split('T')[0]}]` : '无数据'}
   时间差值: ${formatDays(gapDays)} (${timeRangeInfo ? `${coveragePercent}%已覆盖` : '0%已覆盖'})
   最后更新: ${formatDays(updatedDaysAgo)}前 (${event.updated_at.toISOString().split('T')[0]})`;
}

/**
 * 构建完整的提示词（含选择原则）
 */
export function buildPromptWithMetrics(
  events: EventEntity[],
  timeRangeMap: Map<string, TimeRange>,
  currentTime: Date
): string {
  const eventList = events.map((e, idx) => {
    const crawlStatus = e.crawl_end_reason ? `已爬取(${e.crawl_end_reason})` : '未爬取';
    const timeRangeInfo = timeRangeMap.get(e.id);

    const eventStartTime = e.occurred_at || e.created_at;
    const totalDays = calculateDaysDiff(eventStartTime, currentTime);

    let crawledDays = 0;
    let gapDays = totalDays;
    let coveragePercent = 0;

    if (timeRangeInfo) {
      const postMinTime = new Date(timeRangeInfo.min);
      const postMaxTime = new Date(timeRangeInfo.max);
      crawledDays = calculateDaysDiff(postMinTime, postMaxTime);
      const daysBeforeFirstPost = calculateDaysDiff(eventStartTime, postMinTime);
      const daysAfterLastPost = calculateDaysDiff(postMaxTime, currentTime);
      gapDays = Math.max(0, daysBeforeFirstPost) + Math.max(0, daysAfterLastPost);
      coveragePercent = Math.round((crawledDays / totalDays) * 100);
    }

    const updatedDaysAgo = calculateDaysDiff(e.updated_at, currentTime);

    return `${idx + 1}. ID: ${e.id}
   标题: ${e.title}
   分类: ${e.category?.name || '未分类'}
   状态: ${crawlStatus}
   总时间跨度: ${formatDays(totalDays)} (${eventStartTime.toISOString().split('T')[0]} ~ ${currentTime.toISOString().split('T')[0]})
   已爬取: ${timeRangeInfo ? `${formatDays(crawledDays)} (${coveragePercent}%) [${timeRangeInfo.min.split('T')[0]} ~ ${timeRangeInfo.max.split('T')[0]}]` : '无数据'}
   时间差值: ${formatDays(gapDays)} (${timeRangeInfo ? `${coveragePercent}%已覆盖` : '0%已覆盖'})
   最后更新: ${formatDays(updatedDaysAgo)}前 (${e.updated_at.toISOString().split('T')[0]})`;
  }).join('\n\n');

  return `你是一个事件分派专家，需要从以下事件列表中选择一个事件进行爬取。

事件列表：
${eventList}

选择原则（按优先级排序）：
1. 【强制】优先选择未爬取完成的事件（状态为"未爬取"）
2. 【核心】时间差值大者优先 - 时间差值 = 总时间跨度 - 已爬取时间范围，差值越大说明数据缺口越大
3. 【防重】更新时间早者优先 - 优先选择最后更新时间较早的事件，防止重复爬取
4. 【连续】已有时间范围的事件 - 对于已有帖子数据的事件，从最大时间继续爬取，保持数据连续性

注意：
- 时间差值相同的情况下，选择更新时间更早的事件
- 忽略事件热度，专注数据完整性
- 忽略分类平均分配，选择数据缺口最大的事件

请严格按以下 JSON 格式返回你的选择：
\`\`\`json
{
  "selectedEventId": "事件ID",
  "reason": "选择原因（需说明时间差值、更新时间等关键因素）"
}
\`\`\``;
}

/**
 * 创建模拟 EventEntity（带日期）
 */
export function createMockEventWithDates(
  id: string,
  title: string,
  crawlEndReason: string | null,
  occurredAt: string,
  updatedAt: string
): EventEntity {
  const event = new EventEntity();
  event.id = id;
  event.title = title;
  event.crawl_end_reason = crawlEndReason;
  event.status = 'active';
  event.occurred_at = new Date(occurredAt);
  event.created_at = new Date(occurredAt); // 简化处理
  event.updated_at = new Date(updatedAt);

  // 添加模拟的分类
  const category = new EventCategoryEntity();
  category.id = 'category-1';
  category.name = '测试分类';
  event.category = category;

  return event;
}
