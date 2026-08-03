/**
 * 微博 Cookie 工具：Cookie Header 合成与 Token 提取。
 */

/**
 * 将 JSON 格式的 cookies 转换为 Cookie Header 格式。
 * - JSON 数组：提取每项 name=value 片段并用 "; " 连接
 * - 普通字符串：原样返回（若包含 "="）
 * - 空/无效输入：返回 null
 */
export function composeCookieHeader(raw: string | null | undefined): string | null {
    if (!raw || !raw.trim()) {
        return null;
    }

    const trimmed = raw.trim();

    try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
            const fragments = parsed
                .map((entry) => {
                    if (!entry) {
                        return '';
                    }
                    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
                    const value = typeof entry.value === 'string' ? entry.value.trim() : '';
                    if (!name || !value) {
                        return '';
                    }
                    return `${name}=${value}`;
                })
                .filter((fragment) => fragment.length > 0);

            return fragments.length > 0 ? fragments.join('; ') : null;
        }
    } catch {
        // fall through - treat as plain cookie string
    }

    return trimmed.includes('=') ? trimmed : null;
}

/**
 * 从 Cookie Header 中提取 XSRF-TOKEN。
 */
export function extractXsrfToken(cookieHeader: string): string {
    const cookies = cookieHeader.split(';').map(it => it.trim());
    for (const cookie of cookies) {
        const [name, value] = cookie.split('=').map(it => it.trim());
        if (name === 'XSRF-TOKEN' && value) {
            return value;
        }
    }
    return ``;
}
