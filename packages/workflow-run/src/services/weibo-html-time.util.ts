/**
 * 微博搜索 HTML 解析：时间文本解析工具。
 */

/**
 * 解析微博时间文本。
 * 支持 "N分钟前"、"N小时前"、"今天 HH:MM"、"昨天 HH:MM"、
 * "10月27日 21:24" 与 ISO 格式日期。
 */
export function parseTimeText(timeText: string): Date | null {
  if (!timeText) {
    return null;
  }

  const now = new Date();

  // 处理 "N分钟前"
  if (timeText.includes('分钟前')) {
    const minutes = Number.parseInt(timeText, 10);
    if (Number.isFinite(minutes)) {
      return new Date(now.getTime() - minutes * 60 * 1000);
    }
  }

  // 处理 "N小时前"
  if (timeText.includes('小时前')) {
    const hours = Number.parseInt(timeText, 10);
    if (Number.isFinite(hours)) {
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
  }

  // 处理 "今天 HH:MM"
  if (timeText.includes('今天')) {
    const match = timeText.match(/(\d{1,2}):(\d{2})/);
    if (match && match[1] && match[2]) {
      const result = new Date(now);
      result.setHours(Number.parseInt(match[1], 10));
      result.setMinutes(Number.parseInt(match[2], 10));
      result.setSeconds(0);
      result.setMilliseconds(0);
      return result;
    }
  }

  // 处理 "昨天 HH:MM"
  if (timeText.includes('昨天')) {
    const match = timeText.match(/(\d{1,2}):(\d{2})/);
    if (match && match[1] && match[2]) {
      const result = new Date(now);
      result.setDate(result.getDate() - 1);
      result.setHours(Number.parseInt(match[1], 10));
      result.setMinutes(Number.parseInt(match[2], 10));
      result.setSeconds(0);
      result.setMilliseconds(0);
      return result;
    }
  }

  // 处理 "10月27日 21:24" 格式（带时间）
  if (timeText.includes('月') && timeText.includes('日')) {
    const match = timeText.match(/(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
    if (match && match[1] && match[2]) {
      const month = Number.parseInt(match[1], 10);
      const day = Number.parseInt(match[2], 10);
      const hour = match[3] ? Number.parseInt(match[3], 10) : 0;
      const minute = match[4] ? Number.parseInt(match[4], 10) : 0;

      const result = new Date(now.getFullYear(), month - 1, day, hour, minute, 0, 0);

      // 如果日期是未来的（比如在12月解析1月的日期），说明是去年的
      if (result > now) {
        result.setFullYear(now.getFullYear() - 1);
      }

      return result;
    }
  }

  // 处理 ISO 格式日期
  const isoMatch = timeText.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    return new Date(isoMatch[0]);
  }

  return null;
}
