import { Controller, Post, Body, Session } from '@sker/core';
import * as sdk from '@sker/sdk';

/**
 * 文件上传控制器
 *
 * 存在即合理：
 * - 文件在 Hono 层已转换为 JSON（包含 url、name、size、type）
 * - 支持 Base64 图片上传（工作流节点使用）
 */
@Controller(sdk.UploadController)
export class UploadController {
  @Post('file')
  async uploadFile(
    @Body() body: { file: { url: string; name: string; size: number; type: string } }
  ) {
    if (!body.file) {
      throw new Error('未选择文件');
    }

    // 文件已在 Hono 层保存，直接返回信息
    return { url: body.file.url, name: body.file.name };
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

    // Base64 上传暂不支持，需要在 Hono 层处理
    throw new Error('Base64 上传暂未实现');
  }
}
