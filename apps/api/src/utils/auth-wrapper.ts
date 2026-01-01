import { Logger } from '@sker/core';
import { UploadService } from '../services/upload.service';
import { transformRequest } from './request-transformer';

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
    private auth: any,
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
