/**
 * 微博用户历史发帖（mymblog）单页数据入库逻辑。
 *
 * 负责：
 * - 按历史窗口过滤帖子并判断是否命中边界
 * - 作者/帖子实体的去重 upsert
 * - 匿名帖（缺少可落库作者）的降级保存
 */
import {
    useEntityManager,
    WeiboPostEntity,
    WeiboUserEntity,
    PostSnapshotHelper,
} from "@sker/entities";
import {
    WeiboAjaxStatusesMymblogAstResponse,
    TimelinePageIngestResult,
} from "./weibo-ajax-statuses-mymblog.types";
import {
    normalizeIdentity,
    parseStatusCreatedAt,
    pickBoundaryDate,
} from "./weibo-ajax-statuses-mymblog.util";

export async function ingestTimelinePage(
    body: WeiboAjaxStatusesMymblogAstResponse,
    historyCutoff: Date | null,
): Promise<TimelinePageIngestResult> {
    let reachedHistoryBoundary = false;
    const timelineItems = (Array.isArray(body?.data?.list) ? body.data.list : []).filter((item: any) => {
        if (!historyCutoff) {
            return true;
        }

        const createdAt = parseStatusCreatedAt(item?.created_at);
        if (!createdAt) {
            return true;
        }

        const withinWindow = createdAt >= historyCutoff;
        if (!withinWindow) {
            reachedHistoryBoundary = true;
        }

        return withinWindow;
    });

    const latestPostAt = pickBoundaryDate(timelineItems, 'latest');
    const oldestPostAt = pickBoundaryDate(timelineItems, 'oldest');

    if (timelineItems.length === 0) {
        return {
            collectedCount: 0,
            newCount: 0,
            duplicateCount: 0,
            reachedHistoryBoundary,
            latestPostAt,
            oldestPostAt,
            sanitizedUserRefCount: 0,
        };
    }

    return useEntityManager(async (m: any) => {
        const uniqueUsers = Array.from(
            new Map(
                timelineItems
                    .filter((item: any) => item?.user?.id)
                    .map((item: any) => [normalizeIdentity(item.user.id), item.user])
            ).values()
        );
        const users = uniqueUsers.map(user => m.create(WeiboUserEntity, user as any));

        if (users.length > 0) {
            await m.upsert(WeiboUserEntity, users as any, ['id']);
        }

        const persistedUserIds = await findExistingIds(m, WeiboUserEntity, uniqueUsers.map((user: any) => user.id));
        let sanitizedUserRefCount = 0;
        const posts = timelineItems.map((item: any) => {
            const { user, ...rest } = item;
            const normalizedUserId = normalizeIdentity(user?.id);
            const userId = normalizedUserId && persistedUserIds.has(normalizedUserId) ? user?.id ?? null : null;
            if (normalizedUserId && userId === null) {
                sanitizedUserRefCount += 1;
            }

            return m.create(WeiboPostEntity, {
                ...rest,
                user_id: userId,
            });
        });

        const existingPostIds = await findExistingIds(m, WeiboPostEntity, posts.map((post: any) => post.id));
        const newCount = posts.filter((post: any) => {
            const normalizedPostId = normalizeIdentity(post.id);
            return normalizedPostId === null || !existingPostIds.has(normalizedPostId);
        }).length;
        const duplicateCount = posts.length - newCount;

        if (posts.length > 0) {
            await m.upsert(WeiboPostEntity, posts as any, ['id']);
            await PostSnapshotHelper.createSnapshots(m, posts);
        }

        return {
            collectedCount: posts.length,
            newCount,
            duplicateCount,
            reachedHistoryBoundary,
            latestPostAt,
            oldestPostAt,
            sanitizedUserRefCount,
        };
    });
}

async function findExistingIds(
    manager: { find: (entity: unknown, options: Record<string, unknown>) => Promise<Array<{ id?: unknown }>> },
    entity: unknown,
    ids: unknown[],
): Promise<Set<string>> {
    const normalizedIds = Array.from(
        new Set(
            ids
                .map((id) => normalizeIdentity(id))
                .filter((id): id is string => id !== null),
        ),
    );

    if (normalizedIds.length === 0) {
        return new Set();
    }

    const existingRows = await manager.find(entity, {
        select: {
            id: true
        },
        where: normalizedIds.map((id) => ({ id })),
    } as any);

    return new Set(
        existingRows
            .map((row) => normalizeIdentity(row?.id))
            .filter((id): id is string => id !== null),
    );
}
