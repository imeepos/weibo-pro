import {
  Controller,
  Post,
  Body,
  Req
} from '@sker/core';
import { UploadService } from '../services/upload.service';
import type { IncomingMessage } from 'http';
import busboy from 'busboy';
import * as sdk from '@sker/sdk'
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

  async uploadFile(@Req() req: IncomingMessage) {
    const { file, fields } = await this.parseMultipartForm(req);

    if (!file) {
      throw new Error('未选择文件');
    }

    const type = fields.type || 'file';
    const relativePath = await this.uploadService.saveFile(file.buffer, file.filename, type);
    const baseUrl = process.env.S3_BASE_URL || `http://${req.headers.host}`;
    const url = `${baseUrl}${relativePath}`;

    return {
      url,
      name: file.filename,
    };
  }

  /**
   * 解析 multipart/form-data 请求
   */
  private parseMultipartForm(req: IncomingMessage): Promise<{
    file: { buffer: Buffer; filename: string; mimetype: string } | null;
    fields: Record<string, string>;
  }> {
    return new Promise((resolve, reject) => {
      const bb = busboy({
        headers: req.headers as Record<string, string>
      });
      let fileData: { buffer: Buffer; filename: string; mimetype: string } | null = null;
      const fields: Record<string, string> = {};

      bb.on('file', (name, stream, info) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          fileData = {
            buffer: Buffer.concat(chunks),
            filename: info.filename,
            mimetype: info.mimeType,
          };
        });
      });

      bb.on('field', (name, value) => {
        fields[name] = value;
      });

      bb.on('finish', () => {
        resolve({ file: fileData, fields });
      });

      bb.on('error', reject);

      req.pipe(bb);
    });
  }

  async uploadBase64(
    @Body() body: { image: string; filename?: string; type?: string },
    @Req() req?: IncomingMessage
  ) {
    if (!body.image) {
      throw new Error('未提供图片数据');
    }

    const type = body.type || 'image';
    const relativePath = await this.uploadService.saveBase64Image(body.image, body.filename, type);
    const baseUrl = process.env.S3_BASE_URL || (req ? `http://${req.headers.host}` : '');
    const url = `${baseUrl}${relativePath}`;

    return {
      url,
      name: body.filename || 'image.png',
    };
  }
}
