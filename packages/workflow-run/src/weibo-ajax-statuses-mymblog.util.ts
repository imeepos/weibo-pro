/**
 * 微博用户历史发帖（mymblog）抓取的时间窗口、日期边界与身份归一化工具函数。
 */

/**
 * 解析微博状态创建时间。
 */
export function parseStatusCreatedAt(value: unknown): Date | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 在一组帖子中挑选最新 / 最旧的创建时间。
 */
export function pickBoundaryDate(items: unknown[], direction: 'latest' | 'oldest'): Date | null {
    const timestamps = items
        .map((item: any) => parseStatusCreatedAt(item?.created_at))
        .filter((value): value is Date => value !== null);

    if (timestamps.length === 0) {
        return null;
    }

    return timestamps.reduce((selected, current) => {
        if (direction === 'latest') {
            return current > selected ? current : selected;
        }
        return current < selected ? current : selected;
    });
}

export function pickLaterDate(base: Date | null, candidate: Date | null): Date | null {
    if (!base) return candidate;
    if (!candidate) return base;
    return candidate > base ? candidate : base;
}

export function pickEarlierDate(base: Date | null, candidate: Date | null): Date | null {
    if (!base) return candidate;
    if (!candidate) return base;
    return candidate < base ? candidate : base;
}

/**
 * 将任意 ID 归一化为去空白字符串，空值返回 null。
 */
export function normalizeIdentity(value: unknown): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim();
    return text.length > 0 ? text : null;
}

/**
 * 解析非负整数环境变量，非法时回退默认值。
 */
export function resolvePositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * 根据窗口天数解析历史抓取截止时间。
 */
export function resolveHistoryCutoff(windowDays: unknown): Date | null {
    const days = Number(windowDays);
    if (!Number.isFinite(days) || days <= 0) {
        return null;
    }

    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
