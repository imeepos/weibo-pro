import { Injectable } from '@sker/core';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  private formatDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalName: string, type = 'file'): Promise<string> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const date = this.formatDate();
    const dir = path.join(this.uploadDir, type, date);

    await this.ensureDirectory(dir);
    await fs.writeFile(path.join(dir, filename), buffer);

    return `/uploads/${type}/${date}/${filename}`;
  }

  async saveBase64Image(base64Data: string, filename?: string, type = 'image'): Promise<string> {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = matches?.[1] ?? 'png';
    const base64 = matches?.[2] ?? base64Data;
    const buffer = Buffer.from(base64, 'base64');
    const name = filename || `${uuidv4()}.${ext}`;
    const date = this.formatDate();
    const dir = path.join(this.uploadDir, type, date);

    await this.ensureDirectory(dir);
    await fs.writeFile(path.join(dir, name), buffer);

    return `/uploads/${type}/${date}/${name}`;
  }

  async deleteFile(url: string): Promise<void> {
    const relativePath = url.replace(/^\/uploads\//, '');
    const filepath = path.join(this.uploadDir, relativePath);

    try {
      await fs.unlink(filepath);
    } catch {
      // 文件不存在时忽略
    }
  }
}
