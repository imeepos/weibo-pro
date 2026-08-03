/**
 * 用户档案(dossier)纯工具函数。
 * 不依赖数据库与业务实体，仅包含可复用的时间窗口计算与活跃时段推导。
 */

export function resolveWindowStart(windowDays: number): Date | null {
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return null;
  }

  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
}

export function deriveActivePeriods(hourly: Array<{ hour: number; count: number }>): string[] {
  const buckets = [
    { label: '凌晨活跃', start: 0, end: 5 },
    { label: '上午活跃', start: 6, end: 11 },
    { label: '下午活跃', start: 12, end: 17 },
    { label: '夜间活跃', start: 18, end: 23 },
  ];

  return buckets
    .map((bucket) => ({
      label: bucket.label,
      count: hourly
        .filter((item) => item.hour >= bucket.start && item.hour <= bucket.end)
        .reduce((sum, item) => sum + item.count, 0),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((item) => item.label);
}
