import { Controller, Post, Body } from '@sker/core'

export interface UploadFileResponse {
  url: string
  name: string
}

export interface UploadBase64Request {
  image: string
  filename?: string
}

/**
 * 文件上传 SDK 控制器
 *
 * 存在即合理：
 * - 提供类型安全的上传 API 调用
 * - 前端工作流节点上传图片
 */
@Controller('api/upload')
export class UploadController {

  @Post('file')
  uploadFile(formData: FormData): Promise<UploadFileResponse> {
    throw new Error('method uploadFile not implements')
  }

  @Post('base64')
  uploadBase64(@Body() body: UploadBase64Request): Promise<UploadFileResponse> {
    throw new Error('method uploadBase64 not implements')
  }
}
