import { Logger } from '@sker/core';
import { UploadService } from '../services/upload.service';

export interface TransformedRequest {
  request: Request;
  transformed: boolean;
}

/**
 * 转换非 JSON 请求为 JSON 请求
 * Better Auth 只接受 application/json
 */
export async function transformRequest(
  originalRequest: Request,
  uploadService: UploadService,
  logger: Logger
): Promise<TransformedRequest> {
  const contentType = originalRequest.headers.get('content-type') || '';

  // 已经是 JSON 请求，直接返回
  if (contentType.includes('application/json')) {
    return { request: originalRequest, transformed: false };
  }

  try {
    let jsonBody: Record<string, any> = {};

    // 处理 multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      logger.info('📤 转换 multipart/form-data → JSON');
      const formData = await originalRequest.formData();

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const relativePath = await uploadService.saveFileStream(
            value.stream(),
            value.name,
            'file'
          );
          const url = `${process.env.S3_BASE_URL || ''}${relativePath}`;

          jsonBody[key] = {
            url,
            name: value.name,
            size: value.size,
            type: value.type,
          };

          logger.info('✅ 文件已处理', { key, url });
        } else {
          jsonBody[key] = value;
        }
      }
    }
    // 处理 application/x-www-form-urlencoded
    else if (contentType.includes('application/x-www-form-urlencoded')) {
      logger.info('📤 转换 form-urlencoded → JSON');
      const formData = await originalRequest.formData();

      for (const [key, value] of formData.entries()) {
        jsonBody[key] = value;
      }
    }
    // 处理 text/plain 或其他文本格式
    else if (contentType.includes('text/')) {
      logger.info('📤 转换 text → JSON');
      const text = await originalRequest.text();
      jsonBody = { data: text };
    }
    // 其他未知格式，尝试作为文本处理
    else {
      logger.warn('⚠️ 未知 Content-Type，尝试作为文本处理', { contentType });
      const text = await originalRequest.text();
      jsonBody = { data: text };
    }

    // 重新构造 Request
    const newHeaders = new Headers(originalRequest.headers);
    newHeaders.set('content-type', 'application/json');

    const transformedRequest = new Request(originalRequest.url, {
      method: originalRequest.method,
      headers: newHeaders,
      body: JSON.stringify(jsonBody),
    });

    logger.info('🔄 请求已转换为 JSON', { body: jsonBody });

    return { request: transformedRequest, transformed: true };
  } catch (error) {
    logger.error('❌ 请求转换失败', error);
    return { request: originalRequest, transformed: false };
  }
}
