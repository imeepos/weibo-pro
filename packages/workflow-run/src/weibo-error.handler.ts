import { NoRetryError } from '@sker/core';

/**
 * 微博 API 错误类型
 */
export enum WeiboErrorType {
    /** 网络错误 */
    NETWORK_ERROR = 'NETWORK_ERROR',
    /** HTTP 错误（4xx, 5xx） */
    HTTP_ERROR = 'HTTP_ERROR',
    /** 登录态失效 */
    LOGIN_EXPIRED = 'LOGIN_EXPIRED',
    /** API 返回错误（ok !== 1） */
    API_ERROR = 'API_ERROR',
    /** 数据库操作失败 */
    DATABASE_ERROR = 'DATABASE_ERROR',
    /** 未知错误 */
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 微博 API 错误
 */
export class WeiboError extends Error {
    constructor(
        public readonly type: WeiboErrorType,
        message: string,
        public readonly statusCode?: number,
        public readonly response?: any,
    ) {
        super(message);
        this.name = 'WeiboError';
    }
}

/**
 * 微博错误处理器
 *
 * 存在即合理：
 * - 统一错误检测和分类
 * - 统一重试决策
 * - 消除 8 处不一致的错误处理逻辑
 *
 * 优雅即简约：
 * - 错误类型化：WeiboError 携带完整的错误上下文
 * - 决策清晰：shouldRetry 明确哪些错误需要重试
 * - 职责单一：只负责错误识别和分类，不执行重试
 */
export class WeiboErrorHandler {
    /**
     * 检测 HTML 内容是否包含登录页特征
     *
     * @param html HTML 响应内容
     * @returns true 表示登录已过期
     */
    static isLoginExpired(html: string): boolean {
        return html.includes('v6/login/loginLayer.js') || html.includes('登录');
    }

    /**
     * 处理 HTTP 响应，检测错误并分类
     *
     * @param response fetch Response 对象
     * @param data 已解析的响应数据（可选）
     * @returns 成功时返回 null，失败时返回 WeiboError
     */
    static async checkResponse(
        response: Response,
        data?: any,
    ): Promise<WeiboError | null> {
        // 检查 HTTP 状态码
        if (!response.ok) {
            // 4xx 错误通常不需要重试
            if (response.status >= 400 && response.status < 500) {
                return new WeiboError(
                    WeiboErrorType.HTTP_ERROR,
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                );
            }

            // 5xx 错误可以重试
            return new WeiboError(
                WeiboErrorType.HTTP_ERROR,
                `HTTP ${response.status}: ${response.statusText}`,
                response.status,
            );
        }

        // 检查响应内容类型
        const contentType = response.headers.get('content-type') || '';

        // 如果返回 HTML，可能是登录页
        if (contentType.includes('text/html')) {
            const html = await response.text();
            if (this.isLoginExpired(html)) {
                return new WeiboError(
                    WeiboErrorType.LOGIN_EXPIRED,
                    '登录态已过期，需要更换账号',
                    response.status,
                    { html: html.substring(0, 500) }, // 只保留前 500 字符
                );
            }
        }

        // 检查 JSON 响应的 ok 字段
        if (data && typeof data === 'object') {
            if ('ok' in data && data.ok !== 1 && data.ok !== undefined) {
                console.log(data)
                return new WeiboError(
                    WeiboErrorType.API_ERROR,
                    `API 返回错误: ok=${data.ok}`,
                    response.status,
                    data,
                );
            }
        }

        return null; // 没有错误
    }

    /**
     * 判断错误是否应该重试
     *
     * @param error 错误对象
     * @returns true 表示应该重试
     */
    static shouldRetry(error: WeiboError | Error): boolean {
        if (!(error instanceof WeiboError)) {
            // 非 WeiboError，默认可以重试（如网络超时）
            return true;
        }

        switch (error.type) {
            case WeiboErrorType.NETWORK_ERROR:
                // 网络错误：可以重试
                return true;

            case WeiboErrorType.HTTP_ERROR:
                // 5xx 服务器错误：可以重试
                // 4xx 客户端错误：不重试
                return error.statusCode ? error.statusCode >= 500 : false;

            case WeiboErrorType.LOGIN_EXPIRED:
                // 登录过期：不重试，应该更换账号
                return false;

            case WeiboErrorType.API_ERROR:
                // API 错误：一般不重试
                return false;

            case WeiboErrorType.DATABASE_ERROR:
                // 数据库错误：可以重试
                return true;

            case WeiboErrorType.UNKNOWN_ERROR:
            default:
                // 未知错误：不重试，避免无限循环
                return false;
        }
    }

    /**
     * 将错误转换为 NoRetryError（如果不应重试）
     *
     * @param error 原始错误
     * @returns NoRetryError 或原错误
     */
    static toNoRetryErrorIfNeeded(error: WeiboError | Error): Error {
        if (!this.shouldRetry(error)) {
            return new NoRetryError(error.message, { cause: error });
        }
        return error;
    }

    /**
     * 创建数据库错误
     *
     * @param originalError 原始错误
     * @param context 错误上下文（如操作的表名、ID等）
     */
    static createDatabaseError(originalError: Error, context?: Record<string, any>): WeiboError {
        return new WeiboError(
            WeiboErrorType.DATABASE_ERROR,
            `数据库操作失败: ${originalError.message}`,
            undefined,
            { originalError, context },
        );
    }
}
