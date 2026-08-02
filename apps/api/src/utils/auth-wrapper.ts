import { Logger } from '@sker/core';
import { UploadService } from '../services/upload.service';
import { transformRequest } from './request-transformer';
import { Auth } from 'better-auth'
export interface BetterAuthWrapperOptions {
  uploadService: UploadService;
  logger: Logger;
}

/**
 * Better Auth 包装器
 * 扩展 Better Auth 支持多种请求和响应格式
 */
export class BetterAuthWrapper {
  constructor(
    // better-auth 1.6 的 `betterAuth()` 返回 `Auth<Options>`（Options 为具体配置字面量），
    // 而默认的 `Auth` 是 `Auth<BetterAuthOptions>`，因 `$context` 泛型不变性导致不兼容。
    // 此处仅使用 `auth.handler`，用 `Auth<any>` 接收任意配置的 auth 实例。
    private auth: Auth<any>,
    private options: BetterAuthWrapperOptions
  ) {}

  /**
   * 处理请求
   */
  async handle(
    request: Request
  ): Promise<Response> {
    const { uploadService, logger } = this.options;
    try {
      const { request: transformedRequest } = await transformRequest(
        request,
        uploadService,
        logger
      );
      const response = await this.auth.handler(transformedRequest);
      return response;
    } catch (error) {
      logger.error('❌ Better Auth 处理失败', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }
      );
    }
  }
}
