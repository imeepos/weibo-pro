/**
 * 社区匹配算法模块
 *
 * 负责社区间的成员相似度计算（Jaccard）、相邻时间切片社区匹配，
 * 以及匹配关系的反向映射（用于分裂/合并检测）。
 */
import type { CommunityTimeSlice } from '@sker/sdk';

/**
 * 社区匹配函数类型签名
 *
 * 通过参数注入的方式传入，便于调用方在演化事件检测中
 * 复用相同的匹配策略（含测试替身）。
 */
export type CommunityMatcher = (
  prevSlice: CommunityTimeSlice,
  currSlice: CommunityTimeSlice,
  threshold?: number
) => Map<string, string>;

/**
 * 计算两个成员集合的 Jaccard 相似度
 */
export function calculateJaccardSimilarity(setA: string[], setB: string[]): number {
  const setAUnique = new Set(setA);
  const setBUnique = new Set(setB);

  if (setAUnique.size === 0 || setBUnique.size === 0) {
    return 0;
  }

  const intersection = new Set([...setAUnique].filter((x) => setBUnique.has(x)));
  const union = new Set([...setAUnique, ...setBUnique]);

  return intersection.size / union.size;
}

/**
 * 匹配两个时间切片中的社区
 *
 * 为前一切片的每个社区寻找后一切片中相似度最高的社区，
 * 相似度超过阈值（默认 0.5）才建立匹配关系。
 */
export function matchCommunities(
  prevSlice: CommunityTimeSlice,
  currSlice: CommunityTimeSlice,
  threshold = 0.5
): Map<string, string> {
  const matches = new Map<string, string>();

  for (const prevComm of prevSlice.communities) {
    let bestMatch: string | null = null;
    let bestSimilarity = threshold;

    for (const currComm of currSlice.communities) {
      const similarity = calculateJaccardSimilarity(
        prevComm.members.map((m) => m.userId),
        currComm.members.map((m) => m.userId)
      );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = currComm.id;
      }
    }

    if (bestMatch) {
      matches.set(prevComm.id, bestMatch);
    }
  }

  return matches;
}

/**
 * 反转匹配关系：currCommunityId -> [prevCommunityIds]
 *
 * 当一个当前社区匹配了多个先前社区时，表示发生了合并；
 * 多个先前社区映射到同一个当前社区，用于分裂/合并分析。
 */
export function reverseMatch(matches: Map<string, string>): Map<string, string[]> {
  const reverseMap = new Map<string, string[]>();

  for (const [prevId, currId] of matches) {
    if (!reverseMap.has(currId)) {
      reverseMap.set(currId, []);
    }
    reverseMap.get(currId)!.push(prevId);
  }

  return reverseMap;
}
