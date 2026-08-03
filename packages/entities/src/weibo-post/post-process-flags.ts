/**
 * 帖子处理状态位标志
 * 6 位二进制，每位代表一种处理状态
 */
export const PostProcessFlags = {
  /** 000001 - 已完成 NLP 分析 */
  NLP_COMPLETED: 1 << 0,
  /** 000010 - 预留 */
  RESERVED_1: 1 << 1,
  /** 000100 - 预留 */
  RESERVED_2: 1 << 2,
  /** 001000 - 预留 */
  RESERVED_3: 1 << 3,
  /** 010000 - 预留 */
  RESERVED_4: 1 << 4,
  /** 100000 - 预留 */
  RESERVED_5: 1 << 5,
} as const;
