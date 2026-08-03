export * from './error-base';
export * from './error-domain';
export * from './error-http';
export * from './error-factory';

import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from './error-http';

/**
 * 别名导出（兼容 NestJS 习惯）
 *
 * 注意：建议使用 *Error 后缀，但提供别名以兼容现有代码
 */
export const BadRequestException = BadRequestError;
export const NotFoundException = NotFoundError;
export const UnauthorizedException = UnauthorizedError;
export const ForbiddenException = ForbiddenError;
