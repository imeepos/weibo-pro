import { Controller, Post, Body, Session, UploadedFile } from '@sker/core';
import { UploadService } from '../services/upload.service';
import * as sdk from '@sker/sdk';

/**
 * 文件上传控制器
 *
 * 存在即合理：
 * - 支持 multipart/form-data 文件上传
 * - 支持 Base64 图片上传（工作流节点使用）
 */
@Controller(sdk.UploadController)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  async uploadFile(
    @Session() session: any,
    @UploadedFile('file') file: { buffer: Buffer; filename: string; mimetype: string }
  ) {
    if (!session) {
      throw new Error('Unauthorized');
    }
    if (!file) {
      throw new Error('未选择文件');
    }

    const relativePath = await this.uploadService.saveFile(file.buffer, file.filename, 'file');
    const baseUrl = process.env.S3_BASE_URL || '';
    const url = `${baseUrl}${relativePath}`;

    return { url, name: file.filename };
  }

  @Post('base64')
  async uploadBase64(
    @Session() session: any,
    @Body() body: { image: string; filename?: string; type?: string }
  ) {
    if (!session) {
      throw new Error('Unauthorized');
    }
    if (!body.image) {
      throw new Error('未提供图片数据');
    }

    const type = body.type || 'image';
    const relativePath = await this.uploadService.saveBase64Image(body.image, body.filename, type);
    const baseUrl = process.env.S3_BASE_URL || '';
    const url = `${baseUrl}${relativePath}`;

    return { url, name: body.filename || 'image.png' };
  }
}
