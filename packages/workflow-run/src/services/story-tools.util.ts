/**
 * 故事工具工厂纯工具函数
 *
 * 从 StoryToolsFactory.ts 抽取的无状态工具函数：
 * - truncateContent：智能截断内容（头 + 中间 + 尾）
 * - createMatcher：创建匹配器（literal / regex / glob）
 * - extractContextForMatches：提取匹配上下文
 */

/** 搜索匹配器返回结构 */
export interface SearchMatchResult {
  matched: boolean;
  matches?: RegExpMatchArray[];
}

export type SearchMatcher = (text: string) => SearchMatchResult;

/**
 * 智能截断内容：头 + 中间 + 尾
 * 策略：头部300字 + 中间200字 + 尾部300字，避免上下文过长
 */
export function truncateContent(content: string): string {
  const headLength = 300;
  const middleLength = 200;
  const tailLength = 300;
  const minLength = headLength + middleLength + tailLength;

  // 如果内容本身很短，直接返回
  if (content.length <= minLength) {
    return content;
  }

  // 截取头部
  const head = content.substring(0, headLength);

  // 截取中间（从正中间位置）
  const middleStart = Math.floor((content.length - middleLength) / 2);
  const middle = content.substring(middleStart, middleStart + middleLength);

  // 截取尾部
  const tail = content.substring(content.length - tailLength);

  // 计算省略的字数
  const omittedBefore = middleStart - headLength;
  const omittedAfter = content.length - tailLength - (middleStart + middleLength);

  return `${head}\n\n...【省略 ${omittedBefore} 字】...\n\n${middle}\n\n...【省略 ${omittedAfter} 字】...\n\n${tail}`;
}

/**
 * 创建匹配器（literal / regex / glob）
 */
export function createMatcher(pattern: string, mode: string): SearchMatcher {
  try {
    if (mode === 'regex') {
      const _regex = new RegExp(pattern, 'gi');
      return (text: string) => {
        const matches = Array.from(text.matchAll(new RegExp(pattern, 'gi')));
        return { matched: matches.length > 0, matches };
      };
    }

    if (mode === 'glob') {
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(regexPattern, 'gi');
      return (text: string) => {
        const matches = Array.from(text.matchAll(regex));
        return { matched: matches.length > 0, matches };
      };
    }

    // literal
    return (text: string) => {
      const index = text.indexOf(pattern);
      return {
        matched: index !== -1,
        matches: index !== -1 ? [Object.assign([pattern], { index, input: text })] as any : undefined
      };
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`搜索失败：${message}`);
  }
}

/**
 * 提取匹配上下文
 */
export function extractContextForMatches(text: string, matches: RegExpMatchArray[], contextLength: number = 100): string[] {
  if (!matches || matches.length === 0) return [];

  return matches.slice(0, 3).map(match => {
    const index = match.index || 0;
    const matchText = match[0];
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + matchText.length + contextLength);

    return `...${text.substring(start, end)}...`;
  });
}
