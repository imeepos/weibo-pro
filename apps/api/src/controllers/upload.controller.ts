import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../services/upload.service';
import type { Request } from 'express';

/**
 * 文件上传控制器
 *
 * 存在即合理：
 * - 支持 multipart/form-data 文件上传
 * - 支持 Base64 图片上传（工作流节点使用）
 */
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type?: string,
    @Req() req?: Request
  ) {
    if (!file) {
      throw new BadRequestException('未选择文件');
    }

    const finalType = type || 'file';
    const relativePath = await this.uploadService.saveFile(file.buffer, file.originalname, finalType);
    const baseUrl = process.env.S3_BASE_URL || (req ? `${req.protocol}://${req.get('host')}` : '');
    const url = `${baseUrl}${relativePath}`;

    return {
      url,
      name: file.originalname,
    };
  }

  @Post('base64')
  async uploadBase64(
    @Body() body: { image: string; filename?: string; type?: string },
    @Req() req?: Request
  ) {
    if (!body.image) {
      throw new BadRequestException('未提供图片数据');
    }

    const type = body.type || 'image';
    const relativePath = await this.uploadService.saveBase64Image(body.image, body.filename, type);
    const baseUrl = process.env.S3_BASE_URL || (req ? `${req.protocol}://${req.get('host')}` : '');
    const url = `${baseUrl}${relativePath}`;

    return {
      url,
      name: body.filename || 'image.png',
    };
  }
}
