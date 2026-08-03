/**
 * 验证 UUID 格式
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 根据 code 生成中文分类名称（简单转换，主要依赖 LLM 判断）
 */
export function generateCategoryName(code: string): string {
  // 将 snake_case 转为可读格式
  return code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * 解析北京时间字符串为 Date 对象
 * 支持格式：YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DDTHH:mm:ss
 */
export function parseBeijingTime(timeStr: string | undefined | null): Date | null {
  if (!timeStr) return null;

  // 如果已经带时区信息，直接解析
  if (timeStr.includes('+') || timeStr.endsWith('Z')) {
    return new Date(timeStr);
  }

  // 简单格式，按北京时间（UTC+8）处理
  // 将 "2026-01-04 16:54:00" 转换为 "2026-01-04T16:54:00+08:00"
  const normalized = timeStr.replace(' ', 'T') + '+08:00';
  const date = new Date(normalized);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * 判断关键词是否需要更新（简化逻辑：有新关键词就更新）
 */
export function shouldUpdateKeywords(
  existingKeywords: string[] | null | undefined,
  newKeywords: string[] | null | undefined
): boolean {
  // 有新关键词就更新
  return !!(newKeywords && newKeywords.length > 0);
}

/**
 * 判断描述是否需要更新（有新描述就更新）
 */
export function shouldUpdateDescription(
  existingDesc: string | null | undefined,
  newDesc: string | null | undefined
): boolean {
  return !!(newDesc && newDesc.length > 0);
}
