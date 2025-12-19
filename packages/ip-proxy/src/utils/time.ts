/**
 * 获取当前Unix时间戳（毫秒）
 */
export function getUnixTimestamp(): number {
  return Date.now()
}

/**
 * 检查代理是否已过期（带缓冲时间）
 * @param expiresAt 过期时间戳（毫秒）
 * @param bufferMs 缓冲时间（毫秒），默认30000（30秒）
 * @returns 是否已过期
 */
export function isExpired(expiresAt: number, bufferMs: number = 30000): boolean {
  const now = getUnixTimestamp()
  return now >= expiresAt - bufferMs
}

/**
 * 解析过期时间
 * @param expireTime ISO 8601 字符串或时间戳
 * @returns 过期时间戳（毫秒）
 */
export function parseExpireTime(expireTime: string | number): number {
  if (typeof expireTime === 'number') {
    // 如果是秒级时间戳，转换为毫秒
    return expireTime < 10000000000 ? expireTime * 1000 : expireTime
  }

  // ISO 8601 字符串
  const timestamp = new Date(expireTime).getTime()
  if (isNaN(timestamp)) {
    throw new Error(`无效的过期时间格式: ${expireTime}`)
  }
  return timestamp
}

/**
 * 计算相对过期时间戳（从现在开始的秒数）
 * @param expireSeconds 相对过期秒数
 * @param bufferSeconds 缓冲秒数，默认5秒
 * @returns 绝对过期时间戳（毫秒）
 */
export function getAbsoluteExpireTime(
  expireSeconds: number,
  bufferSeconds: number = 5
): number {
  const now = getUnixTimestamp()
  return now + (expireSeconds - bufferSeconds) * 1000
}

/**
 * 格式化时间戳为可读字符串
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化字符串
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}
