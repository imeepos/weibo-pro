import { TimeRange } from './types';

export interface TimeRangeBoundaries {
  start: Date;
  end: Date;
}

/**
 * 获取时间范围的起止时间
 */
export function getTimeRangeBoundaries(timeRange: TimeRange): TimeRangeBoundaries {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (timeRange) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisWeek':
      // 本周一到现在
      const dayOfWeek = now.getDay() || 7; // 周日为7
      start.setDate(now.getDate() - dayOfWeek + 1);
      start.setHours(0, 0, 0, 0);
      end.setTime(now.getTime());
      break;

    case 'lastWeek':
      // 上周一到上周日
      const lastWeekDay = now.getDay() || 7;
      start.setDate(now.getDate() - lastWeekDay - 6);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - lastWeekDay);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisMonth':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setTime(now.getTime());
      break;

    case 'lastMonth':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth());
      end.setDate(0); // 上个月最后一天
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisQuarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start.setMonth(currentQuarter * 3);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setTime(now.getTime());
      break;

    case 'lastQuarter':
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
      start.setFullYear(lastQuarterYear);
      start.setMonth(lastQuarterMonth);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(lastQuarterYear);
      end.setMonth(lastQuarterMonth + 3);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'halfYear':
      start.setMonth(now.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      end.setTime(now.getTime());
      break;

    case 'lastHalfYear':
      start.setMonth(now.getMonth() - 12);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() - 6);
      end.setHours(23, 59, 59, 999);
      break;

    case 'thisYear':
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setTime(now.getTime());
      break;

    case 'lastYear':
      start.setFullYear(now.getFullYear() - 1);
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1);
      end.setMonth(11);
      end.setDate(31);
      end.setHours(23, 59, 59, 999);
      break;

    case 'all':
      start.setFullYear(2000); // 设置一个足够早的日期
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setTime(now.getTime());
      break;

    default:
      // 默认返回今天
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

/**
 * 获取前一个时间范围的起止时间（用于计算变化率）
 */
export function getPreviousTimeRangeBoundaries(timeRange: TimeRange): TimeRangeBoundaries {
  const current = getTimeRangeBoundaries(timeRange);
  const duration = current.end.getTime() - current.start.getTime();

  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.start.getTime() - 1)
  };
}

/**
 * 计算变化率（百分比）
 */
export function calculateChangeRate(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * 获取昨天的时间范围（用于计算地域趋势）
 */
export function getYesterdayBoundaries(): TimeRangeBoundaries {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(now.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
