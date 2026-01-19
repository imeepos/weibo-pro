import { Controller, Post, Body } from '@sker/core'

/**
 * Markdown 转换请求
 * 基于 Cloudflare Browser Rendering API
 */
export interface MarkdownRequest {
  /** 必须提供 url 或 html 其中之一 */
  url?: string
  /** 必须提供 url 或 html 其中之一 */
  html?: string
  /** 排除请求模式（正则表达式数组） */
  rejectRequestPattern?: string[]
  /** 导航选项 */
  gotoOptions?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
    timeout?: number
  }
  /** 等待选择器 */
  waitForSelector?: string
  /** 自定义 User Agent */
  userAgent?: string
}

/**
 * Markdown 转换响应
 */
export interface MarkdownResponse {
  success: boolean
  result: string
}

/**
 * Markdown Controller
 * 将网页内容转换为 Markdown 格式
 */
@Controller('markdown')
export class MarkdownController {
  /**
   * 将网页转换为 Markdown 格式
   * @throws {Error} 方法未实现
   */
  @Post('convert')
  convertToMarkdown(@Body() body: MarkdownRequest): Promise<MarkdownResponse> {
    throw new Error('method convertToMarkdown not implements')
  }
}
