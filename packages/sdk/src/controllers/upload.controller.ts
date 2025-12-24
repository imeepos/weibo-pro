import { Controller, Post, Body } from '@sker/core'

export interface UploadFileResponse {
  url: string
  name: string
}

export interface UploadFileRequest {
  file: {
    url: string
    name: string
    size: number
    type: string
  }
}

export interface UploadBase64Request {
  image: string
  filename?: string
  type?: string
}

/**
 * 文件上传 SDK 控制器
 *
 * 存在即合理：
 * - 文件在 Hono 层已转换为 JSON（包含 url、name、size、type）
 * - 前端发送 FormData，后端接收转换后的 JSON
 */
@Controller('upload')
export class UploadController {

  @Post('file')
  uploadFile(@Body() formData: FormData): Promise<UploadFileResponse> {
    throw new Error('method uploadFile not implements')
  }

  @Post('base64')
  uploadBase64(@Body() body: UploadBase64Request): Promise<UploadFileResponse> {
    throw new Error('method uploadBase64 not implements')
  }
}
