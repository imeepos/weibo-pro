/**
 * UUID v4 生成器（本地实现，避免依赖外部包）
 *
 * 此实现基于高性能的 UUID 生成算法，使用预计算的十六进制表和缓冲池
 */

let IDX = 256
const HEX: string[] = []
let BUFFER: number[] | undefined

// 预计算十六进制字符串表
while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1)

function v4(): string {
  let i = 0
  let num: number
  let out = ''

  // 当缓冲池耗尽时重新生成
  if (!BUFFER || IDX + 16 > 256) {
    BUFFER = Array(256)
    let j = 256
    while (j--) BUFFER[j] = (256 * Math.random()) | 0
    IDX = 0
  }

  // 生成 UUID
  for (; i < 16; i++) {
    num = BUFFER[IDX + i]!
    if (i === 6) out += HEX[(num & 15) | 64] // 版本位
    else if (i === 8) out += HEX[(num & 63) | 128] // 变体位
    else out += HEX[num]

    // 添加连字符
    if (i & 1 && i > 1 && i < 11) out += '-'
  }

  IDX++
  return out
}

/**
 * 生成唯一 ID（UUID v4 格式）
 *
 * @returns UUID 字符串，格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * const id = generateId()
 * // => "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */
export function generateId(): string {
  return v4()
}
