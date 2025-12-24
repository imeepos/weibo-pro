import { Injectable } from '@sker/core';
import type { TrendPoint, UserProfile, PropagationNode, KeywordResult, SentimentResult } from './types';

interface PostData {
  id: string;
  userId: string;
  username: string;
  timestamp: Date;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  sentiment?: SentimentResult;
  keywords?: KeywordResult[];
}

interface CommentData {
  id: string;
  postId: string;
  userId: string;
  username: string;
  timestamp: Date;
  parentId?: string;
}

interface RepostData {
  id: string;
  postId: string;
  userId: string;
  username: string;
  timestamp: Date;
}

@Injectable()
export class Statistics {
  calculateTrend(posts: PostData[], metric: 'like' | 'comment' | 'repost'): TrendPoint[] {
    const grouped = new Map<string, number>();

    posts.forEach((post) => {
      const date = new Date(post.timestamp);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString();

      const value = metric === 'like' ? post.likeCount :
                    metric === 'comment' ? post.commentCount :
                    post.repostCount;

      grouped.set(key, (grouped.get(key) || 0) + value);
    });

    return Array.from(grouped.entries())
      .map(([timestamp, value]) => ({ timestamp: new Date(timestamp), value }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  buildUserProfile(posts: PostData[], comments: CommentData[], reposts: RepostData[]): UserProfile {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const keywordMap = new Map<string, KeywordResult>();

    posts.forEach((post) => {
      if (post.sentiment) {
        sentimentCounts[post.sentiment.overall]++;
      }

      post.keywords?.forEach((kw) => {
        const existing = keywordMap.get(kw.keyword);
        if (existing) {
          existing.count += kw.count;
          existing.weight = Math.max(existing.weight, kw.weight);
        } else {
          keywordMap.set(kw.keyword, { ...kw });
        }
      });
    });

    const total = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
    const topKeywords = Array.from(keywordMap.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    return {
      totalPosts: posts.length,
      totalComments: comments.length,
      totalReposts: reposts.length,
      sentimentDistribution: {
        positive: total > 0 ? sentimentCounts.positive / total : 0,
        negative: total > 0 ? sentimentCounts.negative / total : 0,
        neutral: total > 0 ? sentimentCounts.neutral / total : 0,
      },
      topKeywords,
    };
  }

  buildPropagationTree(
    originalPost: PostData,
    reposts: RepostData[],
    comments: CommentData[]
  ): PropagationNode {
    const root: PropagationNode = {
      userId: originalPost.userId,
      username: originalPost.username,
      timestamp: originalPost.timestamp,
      type: 'original',
      children: [],
    };

    reposts.forEach((repost) => {
      root.children.push({
        userId: repost.userId,
        username: repost.username,
        timestamp: repost.timestamp,
        type: 'repost',
        children: [],
      });
    });

    const commentMap = new Map<string, PropagationNode>();
    comments.forEach((comment) => {
      const node: PropagationNode = {
        userId: comment.userId,
        username: comment.username,
        timestamp: comment.timestamp,
        type: 'comment',
        children: [],
      };
      commentMap.set(comment.id, node);

      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        root.children.push(node);
      }
    });

    return root;
  }
}
