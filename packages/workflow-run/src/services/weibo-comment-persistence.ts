/**
 * 微博评论持久化：实体映射、去重、入库与统计触发。
 */
import {
  useEntityManager,
  WeiboCommentEntity,
  WeiboUserEntity,
  WeiboPostEntity,
  UserRelationStatisticsHelper,
  UserRelationType,
  HourlyStatisticsHelper
} from "@sker/entities";

export interface WeiboAjaxStatusesComponentAstResponse {
    readonly ok: number
    readonly data: WeiboCommentEntity[]
    readonly filter_group: Array<Record<string, unknown>>;
    readonly max_id: number
    readonly rootComment: Array<Record<string, unknown>>;
    readonly total_number: number;
    readonly trendsText: string;
}

/** 使用 EntityManager 持久化一批评论 */
export async function saveComments(
    body: WeiboAjaxStatusesComponentAstResponse,
    postId?: string,
    onNewCount?: (newCount: number) => void
): Promise<WeiboCommentEntity[]> {
    return await useEntityManager(async m => {
        return persistComments(m, body, postId, onNewCount);
    });
}

/** 在给定的 manager 上执行评论持久化（供内部复用与单测） */
export async function persistComments(
    m: any,
    body: WeiboAjaxStatusesComponentAstResponse,
    postId?: string,
    onNewCount?: (newCount: number) => void
): Promise<WeiboCommentEntity[]> {
    const userMap = new Map<number, WeiboUserEntity>();
    body.data.forEach(item => {
        if ((item as any).user?.id) {
            userMap.set((item as any).user.id as number, m.create(WeiboUserEntity, (item as any).user as any));
        }
    });
    const users = Array.from(userMap.values());
    if (users.length > 0) {
        const BATCH_SIZE = 5;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            await m.upsert(WeiboUserEntity, batch as any, ['id']);
        }
    }
    const entities = body.data.map(item => {
        const { user, ...rest } = item as any;

        // 从 analysis_extra 解析 post_author_id
        const authorMatch = rest.analysis_extra?.match(/author_uid:(\d+)/);
        const postAuthorId = authorMatch ? parseInt(authorMatch[1], 10) : null;

        // 解析 reply_to_user_id
        let replyToUserId: number | null = null;
        if (rest.reply_comment?.user?.id) {
            // 子评论：回复某用户的评论
            replyToUserId = rest.reply_comment.user.id;
        } else {
            // 一级评论：回复帖子作者
            replyToUserId = postAuthorId;
        }

        return m.create(WeiboCommentEntity, {
            ...rest,
            user_id: user?.id || null,
            post_id: postId || null,
            post_author_id: postAuthorId,
            reply_to_user_id: replyToUserId,
        });
    });

    // 检查是否有新数据
    let existingIds = new Set<number>();
    if (entities.length > 0) {
        const ids = entities.map(e => e.id).filter(Boolean);
        if (ids.length > 0) {
            const existingRecords = await m.find(WeiboCommentEntity, {
                where: ids.map(id => ({ id }))
            });
            existingIds = new Set(existingRecords.map((r: any) => r.id));
            if (onNewCount) {
                onNewCount(entities.filter(e => !existingIds.has(e.id)).length);
            }
        } else {
            if (onNewCount) {
                onNewCount(0);
            }
        }
    }

    await m.upsert(WeiboCommentEntity, entities as any, ['id']);

    // 入库后触发统计
    if (postId) {
        const post = await m.findOne(WeiboPostEntity, {
            where: { id: postId },
            select: {
                event_id: true
            }
        });

        if (post?.event_id) {
            // 获取新评论列表（利用已有的 existingIds）
            const newComments = entities.filter(e => !existingIds.has(e.id));

            // 用户关系统计 - 只对新评论
            for (const comment of newComments) {
                const sourceUserId = comment.user_id?.toString();
                const targetUserId = comment.reply_to_user_id?.toString();

                if (sourceUserId && targetUserId && sourceUserId !== targetUserId && comment.created_at) {
                    const createdAt = typeof comment.created_at === 'string'
                        ? new Date(comment.created_at)
                        : comment.created_at;
                    await UserRelationStatisticsHelper.upsertRelation(
                        m,
                        sourceUserId,
                        targetUserId,
                        UserRelationType.COMMENT,
                        createdAt,
                        post.event_id
                    );
                }
            }

            // 小时统计 - 只对新评论
            for (const comment of newComments) {
                if (comment.created_at) {
                    const createdAt = typeof comment.created_at === 'string'
                        ? new Date(comment.created_at)
                        : comment.created_at;
                    const timeDimensions = HourlyStatisticsHelper.getTimeDimensions(createdAt);
                    await HourlyStatisticsHelper.upsertStatistics(
                        m,
                        post.event_id,
                        timeDimensions,
                        { comment_count: 1, user_count: 1 }
                    );
                }
            }
        }
    }

    return entities;
}
