import { describe, it, expect, vi, afterEach } from 'vitest';
import { Observable, throwError, of } from 'rxjs';
import type { Ast, NodeEvent } from '@sker/workflow';
import {
  ErrorCategory,
  ErrorClassifier,
  ErrorFormatter,
  ErrorHandlerOperators,
} from './error-handler.util.js';

/** 最小的 AST 实例，只包含错误处理所需字段 */
function makeAst(): Ast {
  return {
    id: 'node-1',
    type: 'TestAst',
    state: 'pending',
    error: undefined,
    metadata: undefined,
  } as unknown as Ast;
}

/** 收集一个 Observable 的全部发射值与终态 */
function collect<T>(obs: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const out: T[] = [];
    obs.subscribe({
      next: (v) => out.push(v),
      error: reject,
      complete: () => resolve(out),
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorClassifier.classify', () => {
  it('classifies null/undefined as UNKNOWN', () => {
    expect(ErrorClassifier.classify(null)).toBe(ErrorCategory.UNKNOWN);
    expect(ErrorClassifier.classify(undefined)).toBe(ErrorCategory.UNKNOWN);
  });

  it('classifies empty object as UNKNOWN', () => {
    expect(ErrorClassifier.classify({})).toBe(ErrorCategory.UNKNOWN);
  });

  it('classifies network errors by message', () => {
    expect(ErrorClassifier.classify(new Error('fetch failed'))).toBe(ErrorCategory.NETWORK);
    expect(ErrorClassifier.classify({ message: 'socket hang up' })).toBe(ErrorCategory.NETWORK);
    expect(ErrorClassifier.classify({ code: 'ECONNRESET' })).toBe(ErrorCategory.NETWORK);
    expect(ErrorClassifier.classify({ code: 'ETIMEDOUT' })).toBe(ErrorCategory.NETWORK);
  });

  it('classifies rate limit errors by message/code/status', () => {
    expect(ErrorClassifier.classify({ message: 'rate limit exceeded' })).toBe(ErrorCategory.RATE_LIMIT);
    expect(ErrorClassifier.classify({ message: 'too many requests' })).toBe(ErrorCategory.RATE_LIMIT);
    expect(ErrorClassifier.classify({ code: '429' })).toBe(ErrorCategory.RATE_LIMIT);
    expect(ErrorClassifier.classify({ status: 429 })).toBe(ErrorCategory.RATE_LIMIT);
  });

  it('classifies server errors by status/message', () => {
    expect(ErrorClassifier.classify({ status: 500 })).toBe(ErrorCategory.SERVER_ERROR);
    expect(ErrorClassifier.classify({ status: 503 })).toBe(ErrorCategory.SERVER_ERROR);
    expect(ErrorClassifier.classify({ message: 'internal server error' })).toBe(ErrorCategory.SERVER_ERROR);
    expect(ErrorClassifier.classify({ message: 'bad gateway' })).toBe(ErrorCategory.SERVER_ERROR);
    expect(ErrorClassifier.classify({ message: 'gateway timeout' })).toBe(ErrorCategory.SERVER_ERROR);
  });

  it('classifies authentication errors by message/code/status', () => {
    expect(ErrorClassifier.classify({ message: 'unauthorized' })).toBe(ErrorCategory.AUTHENTICATION);
    expect(ErrorClassifier.classify({ message: 'invalid api key' })).toBe(ErrorCategory.AUTHENTICATION);
    expect(ErrorClassifier.classify({ code: '403' })).toBe(ErrorCategory.AUTHENTICATION);
    expect(ErrorClassifier.classify({ status: 401 })).toBe(ErrorCategory.AUTHENTICATION);
    expect(ErrorClassifier.classify({ status: 403 })).toBe(ErrorCategory.AUTHENTICATION);
  });

  it('classifies client errors (4xx, excluding 401/403/429)', () => {
    expect(ErrorClassifier.classify({ status: 400 })).toBe(ErrorCategory.CLIENT_ERROR);
    expect(ErrorClassifier.classify({ status: 404 })).toBe(ErrorCategory.CLIENT_ERROR);
    expect(ErrorClassifier.classify({ message: 'bad request' })).toBe(ErrorCategory.CLIENT_ERROR);
    expect(ErrorClassifier.classify({ message: 'invalid request' })).toBe(ErrorCategory.CLIENT_ERROR);
  });

  it('classifies workflow cancelled errors', () => {
    expect(ErrorClassifier.classify({ message: '工作流已取消' })).toBe(ErrorCategory.WORKFLOW_CANCELLED);
    expect(ErrorClassifier.classify(new Error('workflow cancelled'))).toBe(ErrorCategory.WORKFLOW_CANCELLED);
  });
});

describe('ErrorClassifier.isRetryable', () => {
  it('returns true for network/rate_limit/server_error', () => {
    expect(ErrorClassifier.isRetryable({ status: 500 })).toBe(true);
    expect(ErrorClassifier.isRetryable({ message: 'fetch failed' })).toBe(true);
    expect(ErrorClassifier.isRetryable({ status: 429 })).toBe(true);
  });

  it('returns false for non-retryable categories', () => {
    expect(ErrorClassifier.isRetryable({ status: 401 })).toBe(false);
    expect(ErrorClassifier.isRetryable({ status: 400 })).toBe(false);
    expect(ErrorClassifier.isRetryable({ message: '工作流已取消' })).toBe(false);
    expect(ErrorClassifier.isRetryable(new Error('boom'))).toBe(false);
    expect(ErrorClassifier.isRetryable(null)).toBe(false);
  });
});

describe('ErrorFormatter.format', () => {
  it('returns 未知错误 for falsy errors', () => {
    expect(ErrorFormatter.format(null)).toBe('未知错误');
  });

  it('formats rate limit errors as friendly message', () => {
    expect(ErrorFormatter.format({ status: 429, message: 'too many requests' })).toBe('API 速率限制，请稍后重试');
  });

  it('formats authentication errors as friendly message', () => {
    expect(ErrorFormatter.format({ status: 401, message: 'unauthorized' })).toBe('API 认证失败，请检查 API Key');
  });

  it('formats network errors as friendly message', () => {
    expect(ErrorFormatter.format({ message: 'fetch failed' })).toBe('网络连接失败，请检查网络');
  });

  it('formats server errors with HTTP status prefix', () => {
    expect(ErrorFormatter.format({ status: 500, message: 'internal server error' })).toBe(
      '服务器错误：[HTTP 500] internal server error'
    );
  });

  it('formats client errors with HTTP status prefix', () => {
    expect(ErrorFormatter.format({ status: 400, message: 'bad request' })).toBe(
      '请求错误：[HTTP 400] bad request'
    );
  });

  it('formats workflow cancelled errors', () => {
    expect(ErrorFormatter.format({ message: '工作流已取消' })).toBe('工作流已取消');
  });

  it('formats unknown errors with code prefix', () => {
    expect(ErrorFormatter.format({ code: 'E123', message: 'boom' })).toBe('操作失败：[E123] boom');
  });
});

describe('ErrorHandlerOperators.createRetryOperator', () => {
  it('retries a retryable error and recovers on the next attempt', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let attempt = 0;
    const emit: NodeEvent[] = [{ type: 'node_emit', id: 'node-1', data: { ok: true } }];

    const source = new Observable<NodeEvent[]>((sub) => {
      attempt++;
      if (attempt === 1) {
        sub.error(new Error('ECONNRESET'));
      } else {
        sub.next(emit);
        sub.complete();
      }
    });

    const operator = ErrorHandlerOperators.createRetryOperator(makeAst(), {
      maxRetries: 2,
      logPrefix: '[test]',
    });
    const result = await collect(source.pipe(operator));

    expect(attempt).toBe(2);
    expect(result).toEqual([emit]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('exhausts maxRetries and propagates the final retryable error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const source = new Observable<NodeEvent[]>((sub) => {
      sub.error(new Error('socket hang up'));
    });

    const operator = ErrorHandlerOperators.createRetryOperator(makeAst(), {
      maxRetries: 1,
      logPrefix: '[test]',
    });

    await expect(collect(source.pipe(operator))).rejects.toThrow('socket hang up');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('does not retry non-retryable errors and rethrows them', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const source = new Observable<NodeEvent[]>((sub) => {
      sub.error(new Error('unauthorized'));
    });

    const operator = ErrorHandlerOperators.createRetryOperator(makeAst(), {
      maxRetries: 3,
      logPrefix: '[test]',
    });

    await expect(collect(source.pipe(operator))).rejects.toThrow('unauthorized');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('不可重试'), expect.anything());
  });
});

describe('ErrorHandlerOperators.createCatchErrorOperator', () => {
  it('catches an error, sets ast to fail and emits a node_fail event', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ast = makeAst();
    const source = throwError(() => new Error('boom'));

    const operator = ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[test]' });
    const result = await collect(source.pipe(operator));

    expect(result).toEqual([[{ type: 'node_fail', id: 'node-1', error: '操作失败：boom' }]]);
    expect(ast.state).toBe('fail');
    expect(ast.error).toBeDefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('passes through values when the source does not error', async () => {
    const ast = makeAst();
    const source = of([{ type: 'node_emit' as const, id: 'node-1', data: {} }]);

    const operator = ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[test]' });
    const result = await collect(source.pipe(operator));

    expect(result).toEqual([[{ type: 'node_emit', id: 'node-1', data: {} }]]);
    expect(ast.state).toBe('pending');
  });

  it('formats the node_fail error message using ErrorFormatter', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ast = makeAst();
    const source = throwError(() => ({ status: 401, message: 'unauthorized' } as any));

    const operator = ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[test]' });
    const result = await collect(source.pipe(operator));

    expect(result).toEqual([[{ type: 'node_fail', id: 'node-1', error: 'API 认证失败，请检查 API Key' }]]);
    expect(ast.state).toBe('fail');
    expect(ast.error).toBeDefined();
    errorSpy.mockRestore();
  });
});
