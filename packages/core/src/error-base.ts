/**
 * 不可重试的错误
 * 当执行过程中遇到此类错误时，应立即终止并向外抛出，不应进行重试
 */
interface NodeError {
  captureStackTrace(targetObject: object, constructorOpt?: Function): void;
}
const ErrorWithStack = Error as unknown as NodeError & ErrorConstructor;
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    if (typeof ErrorWithStack.captureStackTrace === "function") {
      ErrorWithStack.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.meta && { meta: this.meta }),
    };
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}
export class NoRetryError extends AppError {
  constructor(message: string, readonly cause?: unknown) {
    super(`NoRetryError`, message, 500, { cause });
  }
}
