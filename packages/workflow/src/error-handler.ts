import { Observable, of } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { Ast } from './ast';
import type { NodeEvent } from './execution/events';
import { setAstError } from './ast-utils/error';

/**
 * 错误类型分类
 */
export enum ErrorCategory {
    /** 网络错误 - 可重试 */
    NETWORK = 'network',
    /** API 限流 - 可重试 */
    RATE_LIMIT = 'rate_limit',
    /** 服务器错误 - 可重试 */
    SERVER_ERROR = 'server_error',
    /** 认证错误 - 不可重试 */
    AUTHENTICATION = 'authentication',
    /** 客户端错误 - 不可重试 */
    CLIENT_ERROR = 'client_error',
    /** 工作流取消 - 不可重试 */
    WORKFLOW_CANCELLED = 'workflow_cancelled',
    /** 未知错误 - 默认不重试 */
    UNKNOWN = 'unknown'
}

/**
 * 错误处理配置
 */
export interface ErrorHandlerConfig {
    /** 最大重试次数 */
    maxRetries?: number;
    /** 基础延迟（毫秒） */
    baseDelay?: number;
    /** 退避因子 */
    backoff?: number;
    /** 最大延迟（毫秒） */
    maxDelay?: number;
    /** 日志前缀 */
    logPrefix?: string;
}

/**
 * 错误分类器
 */
export class ErrorClassifier {
    private static collectErrorDetails(error: any): {
        message: string;
        code: string;
        status: number | null;
    } {
        const messageParts = [
            error?.message,
            error?.name,
            error?.cause?.message,
            error?.cause?.name,
        ].filter((value): value is string => typeof value === 'string' && value.length > 0);
        const codeParts = [
            error?.code,
            error?.cause?.code,
        ].filter((value): value is string => typeof value === 'string' && value.length > 0);

        return {
            message: messageParts.join(' ').toLowerCase(),
            code: codeParts.join(' ').toLowerCase(),
            status: error?.status ? Number(error.status) : null,
        };
    }

    /**
     * 判断错误是否可重试
     */
    static isRetryable(error: any): boolean {
        const category = this.classify(error);
        return [
            ErrorCategory.NETWORK,
            ErrorCategory.RATE_LIMIT,
            ErrorCategory.SERVER_ERROR
        ].includes(category);
    }

    /**
     * 分类错误
     */
    static classify(error: any): ErrorCategory {
        if (!error) return ErrorCategory.UNKNOWN;

        const { message: errorMessage, code: errorCode, status } = this.collectErrorDetails(error);

        // 工作流取消
        if (errorMessage.includes('工作流已取消') || errorMessage.includes('workflow cancelled')) {
            return ErrorCategory.WORKFLOW_CANCELLED;
        }

        // 认证错误
        const authErrors = ['invalid api key', 'authentication failed', 'unauthorized', '401', '403'];
        if (authErrors.some(err => errorMessage.includes(err) || errorCode.includes(err)) || status === 401 || status === 403) {
            return ErrorCategory.AUTHENTICATION;
        }

        // 客户端错误
        const clientErrors = ['invalid request', 'bad request', '400'];
        if (clientErrors.some(err => errorMessage.includes(err) || errorCode.includes(err)) || (status && status >= 400 && status < 500 && status !== 429)) {
            return ErrorCategory.CLIENT_ERROR;
        }

        // 限流错误
        const rateLimitErrors = ['rate limit', 'too many requests', '429'];
        if (rateLimitErrors.some(err => errorMessage.includes(err) || errorCode.includes(err)) || status === 429) {
            return ErrorCategory.RATE_LIMIT;
        }

        // 服务器错误
        if (status && status >= 500 && status < 600) {
            return ErrorCategory.SERVER_ERROR;
        }

        const serverErrors = ['service unavailable', 'internal server error', 'gateway timeout', 'bad gateway', '500', '502', '503', '504'];
        if (serverErrors.some(err => errorMessage.includes(err) || errorCode.includes(err))) {
            return ErrorCategory.SERVER_ERROR;
        }

        // 网络错误
        // `fetch failed` 本身信息较弱，但在页级重试与熔断器都有限次的前提下，
        // 仍应把它视为可恢复网络错误，避免单次瞬时故障直接打断整条蒸馏链路。
        const networkErrors = [
            'fetch failed',
            'econnreset',
            'econnrefused',
            'etimedout',
            'enetunreach',
            'enotfound',
            'network error',
            'socket hang up',
            'und_err_connect_timeout',
        ];
        if (networkErrors.some(err => errorMessage.includes(err) || errorCode.includes(err))) {
            return ErrorCategory.NETWORK;
        }

        return ErrorCategory.UNKNOWN;
    }
}

/**
 * 错误消息格式化器
 */
export class ErrorFormatter {
    /**
     * 格式化错误消息为用户友好的提示
     */
    static format(error: any): string {
        if (!error) return '未知错误';

        const category = ErrorClassifier.classify(error);
        let message = error.message || error.toString();

        // 添加状态码信息
        if (error.status) {
            message = `[HTTP ${error.status}] ${message}`;
        }

        // 添加错误代码
        if (error.code) {
            message = `[${error.code}] ${message}`;
        }

        // 根据错误类型返回友好提示
        switch (category) {
            case ErrorCategory.RATE_LIMIT:
                return 'API 速率限制，请稍后重试';
            case ErrorCategory.AUTHENTICATION:
                return 'API 认证失败，请检查 API Key';
            case ErrorCategory.NETWORK:
                return '网络连接失败，请检查网络';
            case ErrorCategory.SERVER_ERROR:
                return `服务器错误：${message}`;
            case ErrorCategory.CLIENT_ERROR:
                return `请求错误：${message}`;
            case ErrorCategory.WORKFLOW_CANCELLED:
                return '工作流已取消';
            default:
                return `操作失败：${message}`;
        }
    }
}

/**
 * RxJS 错误处理操作符工厂
 */
export class ErrorHandlerOperators {
    /**
     * 创建智能重试操作符
     *
     * @param ast - AST 节点实例
     * @param config - 错误处理配置
     * @returns RxJS retry 操作符配置
     */
    static createRetryOperator(ast: Ast, config: ErrorHandlerConfig = {}) {
        const maxRetries = config.maxRetries ?? ast.metadata?.class?.maxRetries ?? 3;
        const baseDelay = config.baseDelay ?? ast.metadata?.class?.retryDelay ?? 1000;
        const backoff = config.backoff ?? ast.metadata?.class?.retryBackoff ?? 2;
        const maxDelay = config.maxDelay ?? 30000;
        const logPrefix = config.logPrefix ?? `[${ast.type}]`;

        return retry<NodeEvent[]>({
            count: maxRetries,
            delay: (error, retryCount) => {
                const isRetryable = ErrorClassifier.isRetryable(error);

                if (!isRetryable) {
                    const category = ErrorClassifier.classify(error);
                    console.error(`${logPrefix} 不可重试的错误 (${category}):`, error?.message);
                    throw error;
                }

                const delayMs = Math.min(baseDelay * Math.pow(backoff, retryCount - 1), maxDelay);
                const category = ErrorClassifier.classify(error);

                console.warn(
                    `${logPrefix} 第 ${retryCount}/${maxRetries} 次重试，` +
                    `延迟 ${delayMs}ms，错误类型: ${category}，` +
                    `错误: ${error?.message}`
                );

                return of(null).pipe(
                    tap(() => new Promise(resolve => setTimeout(resolve, delayMs)))
                );
            }
        });
    }

    /**
     * 创建错误捕获操作符
     *
     * @param ast - AST 节点实例
     * @param config - 错误处理配置
     * @returns RxJS catchError 操作符
     */
    static createCatchErrorOperator(ast: Ast, config: ErrorHandlerConfig = {}) {
        const logPrefix = config.logPrefix ?? `[${ast.type}]`;

        return catchError<NodeEvent[], Observable<NodeEvent[]>>((error: any) => {
            console.error(`${logPrefix} 操作失败:`, error);

            const errorMessage = ErrorFormatter.format(error);
            const category = ErrorClassifier.classify(error);

            ast.state = 'fail';
            setAstError(ast, new Error(`${errorMessage} (${category})`));

            // 发射错误事件，而不是终止流，允许后续数据继续处理
            return of([
                {
                    type: 'node_fail',
                    id: ast.id,
                    error: errorMessage
                }
            ]);
        });
    }
}
