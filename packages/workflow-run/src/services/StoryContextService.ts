import { Injectable } from '@sker/core';
import { ChapterData, Clue } from '@sker/workflow-ast';

/**
 * 故事上下文服务
 * 职责：管理故事历史、提取关键设定、收集伏笔
 */
@Injectable()
export class StoryContextService {
  /**
   * 从前文章节中提取关键设定元素
   * 用于提醒 LLM 保持世界观一致性
   */
  extractKeySettings(chapters: ChapterData[]): string {
    if (chapters.length === 0) return '（暂无）';

    const settingKeywords = ['系统', '穿越', '能力', '规则', '世界', '设定', '科技', '魔法', '武功', '等级'];
    const foundSettings: string[] = [];

    // 只分析最近3章,避免提示词过长
    const recentChapters = chapters.slice(-3);

    for (const chapter of recentChapters) {
      const text = `${chapter.summary} ${chapter.content.substring(0, 500)}`;

      // 查找包含设定关键词的句子
      const sentences = text.split(/[。!?\n]/).filter(s => s.trim().length > 10);
      for (const sentence of sentences) {
        if (settingKeywords.some(kw => sentence.includes(kw))) {
          foundSettings.push(`- 第${chapter.chapterNumber}章：${sentence.trim()}`);
          if (foundSettings.length >= 5) break;
        }
      }
      if (foundSettings.length >= 5) break;
    }

    return foundSettings.length > 0
      ? foundSettings.join('\n')
      : '（前文未明确建立特殊设定，本章可自由发挥但需为后续章节考虑一致性）';
  }

  /**
   * 收集所有待回填的伏笔
   */
  collectPendingClues(chapters: ChapterData[]): Clue[] {
    const allClues: Clue[] = [];
    const resolvedIds = new Set<string>();

    // 收集所有已回填的伏笔ID
    for (const chapter of chapters) {
      if (chapter.resolvedClueIds) {
        chapter.resolvedClueIds.forEach(id => resolvedIds.add(id));
      }
    }

    // 收集所有待回填的伏笔
    for (const chapter of chapters) {
      if (chapter.clues) {
        for (const clue of chapter.clues) {
          if (clue.status === 'pending' && !resolvedIds.has(clue.id)) {
            allClues.push({
              ...clue,
              chapterNumber: chapter.chapterNumber
            });
          }
        }
      }
    }

    return allClues;
  }
}
