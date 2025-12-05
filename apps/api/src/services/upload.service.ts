import { Injectable } from '@sker/core';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 文件上传服务
 *
 * 存在即合理：
 * - 处理文件存储和路径生成
 * - 统一的错误处理
 * - 自动创建上传目录
 */
@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 保存文件
   * @param buffer 文件 Buffer
   * @param originalName 原始文件名
   * @returns 文件访问 URL
   */
  async saveFile(buffer: Buffer, originalName: string): Promise<string> {
    await this.ensureUploadDir();

    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    await fs.writeFile(filepath, buffer);

    return `/uploads/${filename}`;
  }

  /**
   * 保存 Base64 图片
   * @param base64Data Base64 数据（支持 data:image/png;base64, 前缀）
   * @param filename 可选的文件名
   * @returns 文件访问 URL
   */
  async saveBase64Image(base64Data: string, filename?: string): Promise<string> {
    await this.ensureUploadDir();

    // 移除 data:image/xxx;base64, 前缀
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = matches?.[1] ?? 'png';
    const base64 = matches?.[2] ?? base64Data;

    const buffer = Buffer.from(base64, 'base64');
    const name = filename || `${uuidv4()}.${ext}`;
    const filepath = path.join(this.uploadDir, name);

    await fs.writeFile(filepath, buffer);

    return `/uploads/${name}`;
  }

  /**
   * 删除文件
   */
  async deleteFile(url: string): Promise<void> {
    const filename = path.basename(url);
    const filepath = path.join(this.uploadDir, filename);

    try {
      await fs.unlink(filepath);
    } catch (error) {
      // 文件不存在时忽略错误
    }
  }
}
