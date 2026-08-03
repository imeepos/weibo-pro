import type { PropagationPath } from '@sker/sdk';

/**
 * 构建传播路径（限制数量防止性能问题）
 */
export function buildPropagationPaths(
  leveledReposts: Array<any & { level: number; rootPostId: string }>,
  maxPaths: number,
  postAuthorMap: Map<string, string>
): PropagationPath[] {
  const paths: PropagationPath[] = [];
  const limit = Math.min(leveledReposts.length, maxPaths);

  for (let i = 0; i < limit; i++) {
    const repost = leveledReposts[i];
    // 使用帖子作者名称而不是帖子ID
    const postAuthor = postAuthorMap.get(String(repost.postId)) || `帖子${repost.postId}`;
    // 使用 screenName 而不是 userId，如果没有 screenName 则使用 userId 作为后备
    const userName = repost.screenName || `用户${repost.userId}`;
    paths.push({
      source: postAuthor,
      target: userName,
      weight: 1, // 可以根据需要计算权重
      level: repost.level,
    });
  }

  return paths;
}
