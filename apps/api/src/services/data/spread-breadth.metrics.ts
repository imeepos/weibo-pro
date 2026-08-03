/**
 * 传播广度指标计算模块
 *
 * 负责传播深度（BFS 分层）、传播宽度（每层平均转发数）以及传播广度指数的纯计算逻辑。
 */

/**
 * 计算传播深度和层级
 */
export function calculateSpreadDepth(
  reposts: Array<any>,
  repostMap: Map<string, any>,
  postIds: string[]
): { depth: number; leveledReposts: Array<any & { level: number }> } {
  // 构建子转发映射（每个转发被哪些人转发）
  const childrenMap = new Map<string, string[]>();
  for (const repost of reposts) {
    const postId = String(repost.postId);
    if (!childrenMap.has(postId)) {
      childrenMap.set(postId, []);
    }
    childrenMap.get(postId)!.push(String(repost.repostId));
  }

  // BFS 计算层级
  const visited = new Set<string>();
  const queue: Array<{ postId: string; level: number }> = [];
  const leveledReposts: Array<any & { level: number; rootPostId: string }> = [];

  // 找到所有根转发（直接转发原始帖子的）
  for (const repost of reposts) {
    const postId = String(repost.postId);
    // 检查是否是转发原始帖子
    if (postIds.includes(postId)) {
      queue.push({ postId: String(repost.repostId), level: 1 });
      visited.add(String(repost.repostId));
    }
  }

  // 如果没有找到根转发，所有转发都是第一层
  if (queue.length === 0) {
    for (const repost of reposts) {
      queue.push({ postId: String(repost.repostId), level: 1 });
      visited.add(String(repost.repostId));
    }
  }

  let maxDepth = 0;

  while (queue.length > 0) {
    const { postId, level } = queue.shift()!;
    maxDepth = Math.max(maxDepth, level);

    const repost = repostMap.get(postId);
    if (repost) {
      leveledReposts.push({
        ...repost,
        level,
        // 保留每个转发的实际来源帖子 ID
        rootPostId: String(repost.postId),
      });
    }

    // 添加子节点
    const children = childrenMap.get(postId) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ postId: childId, level: level + 1 });
      }
    }
  }

  return { depth: maxDepth, leveledReposts };
}

/**
 * 计算传播宽度（每层平均转发数）
 */
export function calculateSpreadWidth(leveledReposts: Array<any & { level: number }>): number {
  if (leveledReposts.length === 0) return 0;

  // 统计每层的转发数
  const levelCounts = new Map<number, number>();
  for (const repost of leveledReposts) {
    const level = repost.level;
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
  }

  // 计算平均宽度
  const totalLevels = levelCounts.size;
  if (totalLevels === 0) return 0;

  const totalCount = leveledReposts.length;
  return totalCount / totalLevels;
}

/**
 * 计算传播广度指数
 * breadthIndex = (uniqueReposters / totalReposts) * 0.3
 *              + (spreadDepth / maxDepth) * 0.3
 *              + (spreadWidth / avgWidth) * 0.4
 */
export function calculateBreadthIndex(
  uniqueReposters: number,
  totalReposts: number,
  spreadDepth: number,
  spreadWidth: number
): number {
  // 假设最大深度为 10，平均宽度为 5
  const maxDepth = 10;
  const avgWidth = 5;

  const coverageRatio = totalReposts > 0 ? uniqueReposters / totalReposts : 0;
  const depthRatio = maxDepth > 0 ? Math.min(spreadDepth / maxDepth, 1) : 0;
  const widthRatio = avgWidth > 0 ? Math.min(spreadWidth / avgWidth, 1) : 0;

  return coverageRatio * 0.3 + depthRatio * 0.3 + widthRatio * 0.4;
}
