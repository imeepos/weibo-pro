import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { WeiboCommentEntity, WeiboPostEntity } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';

export interface CommentDepthDistribution {
  depth: number;
  count: number;
  percentage: number;
}

export interface DiscussionHotspot {
  rootCommentId: string;
  rootCommentText: string;
  replyCount: number;
  maxDepth: number;
  participants: number;
}

export interface CommentDepthAnalysis {
  avgThreadDepth: number;
  maxThreadDepth: number;
  replyRatio: number;
  totalRootComments: number;
  totalReplies: number;
  depthDistribution: CommentDepthDistribution[];
  discussionHotspots: DiscussionHotspot[];
}

/**
 * 判断是否为一级评论
 * 一级评论：id === rootid 且 floor_number > 0
 */
function isRootComment(comment: WeiboCommentEntity): boolean {
  return String(comment.id) === String(comment.rootid) && comment.floor_number > 0;
}

@Injectable({ providedIn: 'root' })
export class CommentDepthService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  /**
   * 获取评论深度分析结果
   */
  async getCommentDepth(eventId: string): Promise<CommentDepthAnalysis> {
    const cacheKey = CacheService.buildKey('comment:depth', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchCommentDepth(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchCommentDepth(eventId: string): Promise<CommentDepthAnalysis> {
    return useEntityManager(async (manager) => {
      // 通过帖子关联查询特定事件的评论
      const comments = await manager
        .createQueryBuilder(WeiboCommentEntity, 'comment')
        .innerJoin(WeiboPostEntity, 'post', 'comment.post_id = CAST(post.id AS VARCHAR)')
        .where('post.event_id = :eventId', { eventId })
        .orderBy('comment.created_at', 'ASC')
        .limit(10000)
        .getMany();

      if (comments.length === 0) {
        return this.getDefaultDepth();
      }

      // 分离一级评论和子评论
      const rootComments = comments.filter(isRootComment);
      const replies = comments.filter(c => !isRootComment(c));

      // 构建回复树：rootid -> 评论列表
      const replyMap = new Map<string, WeiboCommentEntity[]>();
      for (const reply of replies) {
        const rootId = String(reply.rootid);
        if (!replyMap.has(rootId)) {
          replyMap.set(rootId, []);
        }
        replyMap.get(rootId)!.push(reply);
      }

      // 计算每个根评论的深度
      const threadDepths = new Map<string, number>();
      const threadParticipants = new Map<string, Set<number | null>>();

      for (const rootComment of rootComments) {
        const rootId = String(rootComment.id);
        const replyChain = replyMap.get(rootId) || [];

        // 计算深度（使用简单的链式追踪）
        const depth = this.calculateThreadDepth(rootComment, replyChain);
        threadDepths.set(rootId, depth);

        // 统计参与者
        const participants = new Set<number | null>([rootComment.user_id]);
        for (const reply of replyChain) {
          participants.add(reply.user_id);
        }
        threadParticipants.set(rootId, participants);
      }

      // 计算统计数据
      const depths = Array.from(threadDepths.values());
      const totalRootComments = rootComments.length;
      const totalReplies = replies.length;
      const maxThreadDepth = depths.length > 0 ? Math.max(...depths) : 0;
      const avgThreadDepth = depths.length > 0
        ? depths.reduce((sum, d) => sum + d, 0) / depths.length
        : 0;
      const replyRatio = comments.length > 0 ? totalReplies / comments.length : 0;

      // 深度分布统计
      const depthDistribution = this.calculateDepthDistribution(threadDepths, totalRootComments);

      // 热门讨论（回复数 >= 3）
      const discussionHotspots = this.identifyHotspots(
        rootComments,
        replyMap,
        threadDepths,
        threadParticipants
      );

      return {
        avgThreadDepth,
        maxThreadDepth,
        replyRatio,
        totalRootComments,
        totalReplies,
        depthDistribution,
        discussionHotspots,
      };
    });
  }

  /**
   * 计算讨论深度
   * 简化算法：使用回复数量和回复链估算深度
   */
  private calculateThreadDepth(
    rootComment: WeiboCommentEntity,
    replies: WeiboCommentEntity[]
  ): number {
    if (replies.length === 0) {
      return 0;
    }

    // 构建回复关系图：user_id -> [reply_to_user_id]
    const replyGraph = new Map<number | null, number | null>();
    for (const reply of replies) {
      replyGraph.set(reply.user_id, reply.reply_to_user_id);
    }

    // 找到最长的回复链
    let maxDepth = 0;
    for (const reply of replies) {
      let depth = 1;
      let currentUserId = reply.user_id;

      // 向上追踪回复链
      while (currentUserId && replyGraph.has(currentUserId)) {
        const repliedTo = replyGraph.get(currentUserId);
        // 如果回复的是根评论作者，停止
        if (repliedTo === rootComment.user_id) {
          break;
        }
        // 如果回复的是其他回复用户，继续追踪
        if (repliedTo && repliedTo !== currentUserId) {
          depth++;
          currentUserId = repliedTo;
        } else {
          break;
        }

        // 防止无限循环
        if (depth > 100) {
          break;
        }
      }

      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * 计算深度分布
   */
  private calculateDepthDistribution(
    threadDepths: Map<string, number>,
    totalThreads: number
  ): CommentDepthDistribution[] {
    const depthCount = new Map<number, number>();

    for (const depth of threadDepths.values()) {
      depthCount.set(depth, (depthCount.get(depth) || 0) + 1);
    }

    const distribution: CommentDepthDistribution[] = [];
    for (const [depth, count] of depthCount.entries()) {
      distribution.push({
        depth,
        count,
        percentage: totalThreads > 0 ? (count / totalThreads) * 100 : 0,
      });
    }

    // 按深度排序
    return distribution.sort((a, b) => a.depth - b.depth);
  }

  /**
   * 识别热门讨论
   * 热门讨论：回复数 >= 3
   */
  private identifyHotspots(
    rootComments: WeiboCommentEntity[],
    replyMap: Map<string, WeiboCommentEntity[]>,
    threadDepths: Map<string, number>,
    threadParticipants: Map<string, Set<number | null>>
  ): DiscussionHotspot[] {
    const hotspots: DiscussionHotspot[] = [];

    for (const rootComment of rootComments) {
      const rootId = String(rootComment.id);
      const replies = replyMap.get(rootId) || [];

      if (replies.length >= 3) {
        hotspots.push({
          rootCommentId: rootId,
          rootCommentText: rootComment.text?.substring(0, 100) || '',
          replyCount: replies.length,
          maxDepth: threadDepths.get(rootId) || 0,
          participants: threadParticipants.get(rootId)?.size || 0,
        });
      }
    }

    // 按回复数降序排序
    return hotspots.sort((a, b) => b.replyCount - a.replyCount);
  }

  /**
   * 获取默认深度分析（空数据）
   */
  private getDefaultDepth(): CommentDepthAnalysis {
    return {
      avgThreadDepth: 0,
      maxThreadDepth: 0,
      replyRatio: 0,
      totalRootComments: 0,
      totalReplies: 0,
      depthDistribution: [],
      discussionHotspots: [],
    };
  }
}
