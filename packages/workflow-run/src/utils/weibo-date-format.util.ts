/**
 * 微博搜索时间格式化工具
 *
 * 将数据库/外部传入的日期值格式化为北京时间 `YYYY-MM-DD-HH` 字符串，
 * 用于微博搜索的 timescope 参数。
 *
 * 从 WeiboKeywordSearchAstVisitor.ts 抽取，保持原逻辑不变。
 */
import { createLogger } from "@sker/core";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const logger = createLogger('WeiboKeywordSearchAstVisitor');

/**
 * 格式化日期为北京时间 `YYYY-MM-DD-HH`
 *
 * - 空对象/null/undefined 静默使用当前时间（北京时间）
 * - 带时区偏移的字符串直接解析（不依赖运行环境）
 * - 其余情况使用 dayjs 解析并转换为北京时间
 */
export const formatDate = (date: Date | string | number | object | undefined | null) => {
    // 处理空对象、null、undefined 的情况 - 静默使用当前时间（北京时间）
    if (date == null || (typeof date === 'object' && !(date instanceof Date) && Object.keys(date as object).length === 0)) {
        return dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD-HH');
    }

    // 如果是带时区偏移的字符串，直接解析字符串（完全不依赖运行环境）
    const dateStr = String(date);
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.\d{3}\s+([+-]\d{4})/);
    if (match) {
        const [, year, month, day, hour] = match;
        // 直接返回解析出的年月日小时（不依赖运行环境）
        return `${year}-${month}-${day}-${hour}`;
    }

    // 使用 dayjs 解析并转换为北京时间
    const time = dayjs(date as string | number | Date);

    if (!time.isValid()) {
        logger.error(`[formatDate] 无效的日期值: ${typeof date === 'object' ? JSON.stringify(date) : date}`);
        return dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD-HH');
    }

    // 明确转换为北京时间
    return time.tz('Asia/Shanghai').format('YYYY-MM-DD-HH');
};
