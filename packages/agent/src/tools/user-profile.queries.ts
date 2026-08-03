import type { EntityManager } from 'typeorm';
import { WeiboPostEntity, PostNLPResultEntity } from '@sker/entities';

/**
 * 用户帖子数据（仅保留分析所需字段）
 */
export interface UserPost {
  created_at: string;
  text: string;
  reposts_count: number;
  comments_count: number;
  attitudes_count: number;
  source: string;
}

/**
 * 用户基础信息（来自帖子关联的 weibo_users 表）
 */
export interface UserInfo {
  screen_name: string;
  verified: boolean;
  verified_type: string | null;
  status_total_counter: { total_cnt?: number } | null;
}

/**
 * 查询用户最近发布的帖子（带用户信息），按时间倒序。
 * 无数据时返回 { posts: [], userInfo: null }。
 */
export async function queryUserPosts(
  m: EntityManager,
  userId: string,
  limit: number
): Promise<{ posts: UserPost[]; userInfo: UserInfo | null }> {
  const result = await m
    .getRepository(WeiboPostEntity)
    .createQueryBuilder('post')
    .leftJoin('weibo_users', 'u', 'u.id = post.user_id')
    .select('post.*')
    .addSelect('u.screen_name', 'user_screen_name')
    .addSelect('u.verified', 'user_verified')
    .addSelect('u.verified_type', 'user_verified_type')
    .addSelect('u.status_total_counter', 'user_status_total_counter')
    .where('post.user_id = :userId', { userId: String(userId) })
    .orderBy('post.created_at', 'DESC')
    .limit(limit)
    .getRawMany();

  if (result.length === 0) {
    return { posts: [], userInfo: null };
  }

  const userInfo = {
    screen_name: result[0]!.user_screen_name,
    verified: result[0]!.user_verified,
    verified_type: result[0]!.user_verified_type,
    status_total_counter: result[0]!.user_status_total_counter,
  };

  const posts = result.map((r) => ({
    ...r,
    created_at: r.created_at,
    text: r.text,
    reposts_count: r.reposts_count,
    comments_count: r.comments_count,
    attitudes_count: r.attitudes_count,
    source: r.source,
  }));

  return { posts, userInfo };
}

/**
 * 查询用户帖子的 NLP 分析结果
 */
export async function queryUserNLPResults(
  m: EntityManager,
  userId: string,
  limit: number
): Promise<PostNLPResultEntity[]> {
  return m
    .getRepository(PostNLPResultEntity)
    .createQueryBuilder('nlp')
    .leftJoin('nlp.post', 'post')
    .where('post.user_id = :userId', { userId: String(userId) })
    .limit(limit)
    .getMany();
}
