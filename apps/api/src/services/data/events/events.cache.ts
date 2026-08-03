/**
 * 构建与某个事件相关的所有缓存键。
 * 包括事件详情、趋势、影响力、地理位置、关键词、情感、列表等缓存。
 */
/** 事件列表缓存统一前缀，清除时按此模式匹配全部组合（分页/搜索/分类/时间窗等） */
export const EVENT_LIST_CACHE_PATTERN = 'events:detail:list:*';

/**
 * 构建与某个事件相关的精确缓存键。
 * 事件列表缓存不在此枚举（组合无限），统一走 EVENT_LIST_CACHE_PATTERN 模式清除。
 */
export function buildEventCacheKeys(eventId: string): string[] {
  return [
    // 事件详情相关缓存
    `events:detail:${eventId}`,
    `event:timeseries:${eventId}`,
    `event:trend:${eventId}`,
    `event:influence_users:${eventId}`,
    `event:geographic:${eventId}`,
    `event:keywords:${eventId}`,
    `event:sentiment_hotness:${eventId}`,
    `event:sentiment_distribution:${eventId}`,
    `event:keywords_timeseries:${eventId}`,
    `event:keywords_by_sentiment:${eventId}`,
    `event:negative_keywords:${eventId}`,
    `event:event_types:${eventId}`,
    `event:engagement_trend:${eventId}`,
    `event:anomalies:${eventId}`,
    `event:peaks:${eventId}`,
    `event:user-relations:${eventId}`,
  ];
}
