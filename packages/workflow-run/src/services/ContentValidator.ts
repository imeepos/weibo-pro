import { Injectable } from '@sker/core';

/**
 * 内容验证器
 * 职责：内容清理、标准化、去重检查
 */
@Injectable()
export class ContentValidator {
  /**
   * 标准化章节标题
   * 移除章节号前缀、空格、标点符号，统一为小写
   */
  normalizeTitle(title: string): string {
    return title
      .replace(/^第.+?章[：:\s]*/g, '')
      .replace(/\s+/g, '')
      .replace(/[,。!?;:、""''()《》【】]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * 清理 content 中重复的标题和简介
   * LLM 有时会在 content 开头重复输出标题和简介,需要移除
   */
  cleanContent(content: string, title: string, summary: string): string {
    let cleaned = content;

    // 移除 Markdown 标题
    cleaned = cleaned.replace(/^##?\s+.*$/m, '').trim();

    // 移除"章节简介"部分
    cleaned = cleaned.replace(/\*\*章节简介\*\*[：:]\s*.*$/m, '').trim();

    // 移除标题文本
    if (cleaned.startsWith(title)) {
      cleaned = cleaned.substring(title.length).trim();
    }

    // 移除简介文本
    const summaryPrefix = summary.substring(0, Math.min(50, summary.length));
    if (cleaned.includes(summaryPrefix)) {
      cleaned = cleaned.replace(summaryPrefix, '').trim();
    }

    // 移除开头的分隔线
    cleaned = cleaned.replace(/^[-—=]+\s*/m, '').trim();

    // 移除末尾的伏笔说明
    cleaned = cleaned.replace(/\n+\*\*本章伏笔\*\*[\s\S]*$/m, '').trim();
    cleaned = cleaned.replace(/\n+\*\*人物弧光\*\*[\s\S]*$/m, '').trim();
    cleaned = cleaned.replace(/\n+\*\*情节推进\*\*[\s\S]*$/m, '').trim();

    return cleaned;
  }
}
