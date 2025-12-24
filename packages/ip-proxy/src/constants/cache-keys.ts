/**
 * Redis缓存键枚举
 */
export enum CacheKeys {
  /** Sorted Set: 代理使用计数，用于轮询分配 */
  USE_COUNTS = 'ip_proxy:use_counts',

  /** Hash Key 前缀: 代理元数据 */
  METADATA_PREFIX = 'ip_proxy:metadata:',

  /** Hash Key 前缀: 代理质量评分 */
  SCORE_PREFIX = 'ip_proxy:score:',
}

/**
 * 生成代理元数据的Redis键
 * @param proxyUrl 代理URL
 * @returns Redis键
 */
export function getMetadataKey(proxyUrl: string): string {
  // 使用URL的hash作为键，避免特殊字符问题
  const hash = createSimpleHash(proxyUrl)
  return `${CacheKeys.METADATA_PREFIX}${hash}`
}

/**
 * 创建简单hash
 * @param str 字符串
 * @returns hash值
 */
function createSimpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
