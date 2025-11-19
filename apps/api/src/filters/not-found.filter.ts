import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { logger } from '@sker/core';

/**
 * 404 异常过滤器：记录所有未找到的路由请求
 *
 * 当请求的路由不存在时，记录详细的请求信息用于诊断问题
 */
@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 记录详细的404请求信息
    logger.warn('API route not found', {
      timestamp: new Date().toISOString(),
      path: request.path,
      method: request.method,
      query: request.query,
      params: request.params,
      headers: {
        'user-agent': request.headers['user-agent'],
        'x-forwarded-for': request.headers['x-forwarded-for'],
        'x-real-ip': request.headers['x-real-ip'],
      },
      url: request.url,
      originalUrl: request.originalUrl,
      baseUrl: request.baseUrl,
      hostname: request.hostname,
      ip: request.ip,
      ips: request.ips,
    });

    response.status(HttpStatus.NOT_FOUND).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method} ${request.path} not found`,
        timestamp: new Date().toISOString(),
        details: {
          path: request.path,
          method: request.method,
          query: request.query,
        },
      },
    });
  }
}