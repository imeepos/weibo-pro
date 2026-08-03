/**
 * 构建与某个事件相关的所有缓存键。
 * 包括事件详情、趋势、影响力、地理位置、关键词、情感、列表等缓存。
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
    // 事件列表缓存（需要清除所有可能的列表缓存）
    `events:detail:list:all:1:10::::0.05`,
    `events:detail:list:all:1:10:::all::0.05`,
    `events:detail:list:24h:1:10::::0.05`,
    `events:detail:list:24h:1:10:::all::0.05`,
    `events:detail:list:7d:1:10::::0.05`,
    `events:detail:list:7d:1:10:::all::0.05`,
    `events:detail:list:30d:1:10::::0.05`,
    `events:detail:list:30d:1:10:::all::0.05`,
    // 更多可能的列表缓存组合
    `events:detail:list:all:1:10::test::0.05`,
    `events:detail:list:24h:1:10::test::0.05`,
    `events:detail:list:7d:1:10::test::0.05`,
    `events:detail:list:30d:1:10::test::0.05`,
    `events:detail:list:all:1:20::::0.05`,
    `events:detail:list:24h:1:20::::0.05`,
    `events:detail:list:7d:1:20::::0.05`,
    `events:detail:list:30d:1:20::::0.05`,
    `events:detail:list:all:1:20:::all::0.05`,
    `events:detail:list:24h:1:20:::all::0.05`,
    `events:detail:list:7d:1:20:::all::0.05`,
    `events:detail:list:30d:1:20:::all::0.05`,
  ];
}
