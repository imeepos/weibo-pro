import { generateId } from '@sker/workflow';
import { ChapterData } from '@sker/workflow-ast';
import { ContentValidator } from '../ContentValidator';

/**
 * 解析后的章节结构
 */
export interface ParsedChapter {
  title: string;
  summary: string;
  content: string;
  clues?: Array<{
    id: string;
    description: string;
    status: 'pending' | 'resolved';
  }>;
  resolvedClueIds?: string[];
}

/**
 * 校验并清洗解析结果，转换为 ChapterData
 * 职责：内容清理、标题去重、组装章节数据
 */
export function validateAndCleanContent(
  parsed: ParsedChapter,
  nextChapterNumber: number,
  existingTitles: Set<string>,
  contentValidator: ContentValidator
): { chapter: ChapterData; attempt: number } {
  const cleanedContent = contentValidator.cleanContent(parsed.content, parsed.title, parsed.summary);
  const normalizedTitle = contentValidator.normalizeTitle(parsed.title);

  if (existingTitles.has(normalizedTitle)) {
    throw new Error(`TITLE_DUPLICATE:${parsed.title}`);
  }

  return {
    chapter: {
      chapterNumber: nextChapterNumber,
      title: parsed.title,
      summary: parsed.summary,
      content: cleanedContent,
      clues: parsed.clues?.map((clue) => ({
        ...clue,
        chapterNumber: nextChapterNumber
      })),
      resolvedClueIds: parsed.resolvedClueIds
    },
    attempt: 0
  };
}

/**
 * 数据清洗：修复 LLM 返回的格式错误
 *
 * 常见错误：
 * 1. clues 是字符串数组而非对象数组
 * 2. resolvedClueIds 包含完整描述而非ID
 */
export function sanitizeChapterData(data: any): any {
  const sanitized = { ...data };

  // 修复 clues：如果是字符串数组，转换为对象数组
  if (Array.isArray(sanitized.clues)) {
    sanitized.clues = sanitized.clues.map((clue: any, _index: number) => {
      if (typeof clue === 'string') {
        // 字符串转对象：生成唯一ID
        return {
          id: `clue_${generateId()}`,
          description: clue,
          status: 'pending'
        };
      }
      return clue;
    });
  }

  // 修复 resolvedClueIds：如果包含完整描述，尝试提取ID或生成警告
  if (Array.isArray(sanitized.resolvedClueIds)) {
    sanitized.resolvedClueIds = sanitized.resolvedClueIds.map((id: any) => {
      if (typeof id === 'string') {
        // 如果长度超过50，可能是描述而非ID，截取或生成ID
        if (id.length > 50) {
          console.warn(`[sanitizeChapterData] resolvedClueIds 包含描述而非ID: "${id.slice(0, 50)}..."`);
          // 尝试从描述中提取ID（如果有 clue_ 前缀）
          const match = id.match(/clue_\w+/);
          return match ? match[0] : `resolved_${generateId()}`;
        }
        return id;
      }
      return id;
    });
  }

  return sanitized;
}

/**
 * 使用起止标记从原始文本中提取正文内容
 *
 * @param rawText 原始文本（包含标题、简介、正文、伏笔说明等）
 * @param startMarker 正文开头标记（前20字左右）
 * @param endMarker 正文结尾标记（后20字左右）
 */
export function extractContentByMarkers(rawText: string, startMarker: string, endMarker: string): string {
  // 去除标记中的空白符，提高匹配成功率
  const normalizedText = rawText.replace(/\s+/g, ' ');
  const normalizedStart = startMarker.replace(/\s+/g, ' ').trim();
  const normalizedEnd = endMarker.replace(/\s+/g, ' ').trim();

  const startIndex = normalizedText.indexOf(normalizedStart);
  const endIndex = normalizedText.indexOf(normalizedEnd);

  if (startIndex === -1) {
    console.warn(`[extractContentByMarkers] 未找到起始标记: "${startMarker.slice(0, 30)}..."`);
    // 降级：使用算法提取
    return extractContentFromRawText(rawText);
  }

  if (endIndex === -1) {
    console.warn(`[extractContentByMarkers] 未找到结束标记: "${endMarker.slice(0, 30)}..."`);
    // 降级：从起始标记到文本末尾
    const startOffset = findOriginalOffset(rawText, normalizedText, startIndex);
    return rawText.substring(startOffset).trim();
  }

  // 计算在原始文本中的偏移量（考虑空白符差异）
  const startOffset = findOriginalOffset(rawText, normalizedText, startIndex);
  const endOffset = findOriginalOffset(rawText, normalizedText, endIndex + normalizedEnd.length);

  const content = rawText.substring(startOffset, endOffset).trim();

  console.log(`[extractContentByMarkers] 成功提取正文，长度: ${content.length} 字符`);
  return content;
}

/**
 * 在原始文本中找到对应于规范化文本位置的偏移量
 */
function findOriginalOffset(originalText: string, normalizedText: string, normalizedOffset: number): number {
  let originalIdx = 0;
  let normalizedIdx = 0;

  while (normalizedIdx < normalizedOffset && originalIdx < originalText.length) {
    const originalChar = originalText[originalIdx] as string;
    const normalizedChar = normalizedText[normalizedIdx];

    if (/\s/.test(originalChar)) {
      // 原始文本是空白符，跳过
      originalIdx++;
      if (normalizedChar === ' ') {
        normalizedIdx++;
      }
    } else {
      // 非空白符，必须匹配
      originalIdx++;
      normalizedIdx++;
    }
  }

  return originalIdx;
}

/**
 * 从原始文本中提取正文内容（降级方案）
 * 去除标题（# 开头的行）和其他元数据标记
 */
function extractContentFromRawText(rawText: string): string {
  // 按行分割
  const lines = rawText.split('\n');
  const contentLines: string[] = [];
  let skipNextEmpty = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过标题行（# 开头）
    if (trimmed.startsWith('#')) {
      skipNextEmpty = true;
      continue;
    }

    // 跳过标题后的第一个空行
    if (skipNextEmpty && trimmed === '') {
      skipNextEmpty = false;
      continue;
    }

    skipNextEmpty = false;
    contentLines.push(line);
  }

  // 去除开头和结尾的空行
  let content = contentLines.join('\n').trim();

  // 去除可能的伏笔说明部分（通常在末尾）
  const clueMarkers = ['**伏笔', '伏笔说明', 'clues:', '本章伏笔'];
  for (const marker of clueMarkers) {
    const index = content.lastIndexOf(marker);
    if (index > content.length * 0.8) { // 只在文本末尾20%处寻找
      content = content.substring(0, index).trim();
    }
  }

  return content;
}
