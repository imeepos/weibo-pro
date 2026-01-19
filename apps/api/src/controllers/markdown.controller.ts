import { Controller } from '@sker/core';
import { root } from '@sker/core';
import { MarkdownService } from '../services/markdown.service';
import * as sdk from '@sker/sdk';

/**
 * Markdown Controller 实现
 * 将网页内容转换为 Markdown 格式
 */
@Controller(sdk.MarkdownController)
export class MarkdownController implements sdk.MarkdownController {
  private markdownService: MarkdownService;

  constructor() {
    this.markdownService = root.get(MarkdownService);
  }

  async convertToMarkdown(body: sdk.MarkdownRequest): Promise<sdk.MarkdownResponse> {
    return this.markdownService.convertToMarkdown(body);
  }
}
