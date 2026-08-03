import { ChapterData, StoryWeaverAst } from '@sker/workflow-ast';
import { ContentValidator } from '../ContentValidator';

/**
 * 可疑章节模式：用于过滤 LLM 生成的伪章节（思考过程、元对话等）
 */
const SUSPICIOUS_PATTERNS = [
  '我先查看', '让我查看', '我需要了解', '让我先',
  '暂无明确章节标题', '我先回顾', '我将', '叙述者回顾', '叙述者表示'
];

/**
 * 章节生成上下文：过滤后的章节列表、是否第一章、下一章编号、已有标题集合
 */
export interface ChapterContext {
  chapters: ChapterData[];
  isFirstChapter: boolean;
  nextChapterNumber: number;
  existingTitles: Set<string>;
}

/**
 * 准备章节生成上下文
 * 职责：过滤可疑/空章节，计算下一章编号，收集已有标题用于去重
 */
export function prepareChapterContext(ast: StoryWeaverAst, contentValidator: ContentValidator): ChapterContext {
  const chapters = filterSuspiciousChapters(ast.previousChapters || []);
  const isFirstChapter = chapters.length === 0;
  const nextChapterNumber = isFirstChapter ? 1 : Math.max(...chapters.map(c => c.chapterNumber)) + 1;
  const existingTitles = new Set(chapters.map(ch => contentValidator.normalizeTitle(ch.title)));
  return { chapters, isFirstChapter, nextChapterNumber, existingTitles };
}

/**
 * 过滤可疑章节（空内容、思考过程、元对话等）
 */
function filterSuspiciousChapters(chapters: ChapterData[]): ChapterData[] {
  return chapters.filter(ch => {
    if (!ch.content || ch.content.trim().length === 0) {
      console.warn(`[ChapterGeneration] 过滤空章节 ${ch.chapterNumber}`);
      return false;
    }

    const titleSuspicious = SUSPICIOUS_PATTERNS.some(pattern => ch.title.includes(pattern));
    const contentSuspicious = SUSPICIOUS_PATTERNS.some(pattern =>
      ch.content && ch.content.substring(0, 200).includes(pattern)
    );

    return !titleSuspicious && !contentSuspicious;
  });
}
