export const ACTIVE_DISTILLATION_TASK_STATUSES = new Set([
  'queued',
  'crawling',
  'extracting',
  'aggregating',
  'publishing',
  'analyzing',
]);

export function normalizeDateLikeValue(value: unknown): string | number | Date | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === 'number' || value instanceof Date) {
    return value;
  }

  return null;
}

export function formatProgressTime(value: unknown): string {
  const normalized = normalizeDateLikeValue(value);
  if (!normalized) {
    return '刚刚';
  }

  const time = new Date(normalized).getTime();
  if (Number.isNaN(time)) {
    return typeof normalized === 'string' ? normalized : '刚刚';
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (diffMinutes < 1) {
    return '刚刚';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

export function formatCoverageTime(value: unknown): string | null {
  const normalized = normalizeDateLikeValue(value);
  if (!normalized) {
    return null;
  }

  if (typeof normalized === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    return normalized.slice(0, 16).replace('T', ' ');
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return typeof normalized === 'string' ? normalized : null;
  }

  return parsed.toISOString().slice(0, 16).replace('T', ' ');
}

export function getStageLabel(stage: string | null | undefined): string {
  switch (stage) {
    case 'queued':
      return '排队中';
    case 'crawling':
      return '历史抓取';
    case 'extracting':
      return '逐帖抽取';
    case 'aggregating':
      return '聚合分析';
    case 'publishing':
      return '发布画像';
    case 'analyzing':
      return '生成画像';
    default:
      return stage ?? '未知阶段';
  }
}
