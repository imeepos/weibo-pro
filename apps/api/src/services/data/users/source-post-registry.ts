import { createHash } from 'node:crypto';
import { useEntityManager, UserProfileSourcePostEntity } from '@sker/entities';

export interface RegisteredSourcePost {
  id: string;
  content_fingerprint: string;
  normalized_text: string;
  source_snapshot: Record<string, unknown>;
}

// 将微博用户的历史发帖登记为可抽取的源帖子（去重/指纹/快照）
export async function registerSourcePostsForTask(input: {
  taskId: string;
  weiboUserId: string;
  eventId?: string;
  windowDays: number;
}): Promise<RegisteredSourcePost[]> {
  return useEntityManager(async (manager) => {
    const sourceRepo = manager.getRepository(UserProfileSourcePostEntity);
    const windowStart = resolveWindowStart(input.windowDays);
    const rows = await manager.query(
      `
        SELECT
          p.id::text AS post_id,
          p.event_id,
          p.created_at,
          COALESCE(p.text_raw, p.text, '') AS text,
          COALESCE(p.comments_count, 0) AS comments_count,
          COALESCE(p.reposts_count, 0) AS reposts_count,
          COALESCE(p.attitudes_count, 0) AS attitudes_count
        FROM weibo_posts p
        WHERE p.user_id::text = $1
          AND p.deleted_at IS NULL
          AND ($2::uuid IS NULL OR p.event_id = $2::uuid)
          AND ($3::timestamptz IS NULL OR p.created_at >= $3::timestamptz)
        ORDER BY p.created_at DESC NULLS LAST
      `,
      [input.weiboUserId, input.eventId ?? null, windowStart],
    );
    const now = new Date();
    const saved: RegisteredSourcePost[] = [];

    for (const row of rows) {
      const normalizedText = normalizeSourcePostText(row.text);
      if (!normalizedText) {
        continue;
      }

      const fingerprint = hashContent(normalizedText);
      const existing = await sourceRepo.findOne({
        where: {
          weibo_user_id: input.weiboUserId,
          post_id: row.post_id,
        },
      });
      const sourceSnapshot = {
        postId: row.post_id,
        eventId: row.event_id ?? null,
        text: row.text,
        normalizedText,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        commentsCount: Number(row.comments_count || 0),
        repostsCount: Number(row.reposts_count || 0),
        attitudesCount: Number(row.attitudes_count || 0),
      };

      const entity = sourceRepo.create({
        id: existing?.id,
        weibo_user_id: input.weiboUserId,
        post_id: row.post_id,
        source_kind: 'post',
        post_created_at: row.created_at ? new Date(row.created_at) : null,
        content_fingerprint: fingerprint,
        normalized_text: normalizedText,
        source_snapshot: sourceSnapshot,
        first_seen_at: existing?.first_seen_at ?? now,
        last_seen_at: now,
        latest_task_id: input.taskId,
      });
      const persisted = await sourceRepo.save(entity);

      saved.push({
        id: persisted.id,
        content_fingerprint: persisted.content_fingerprint,
        normalized_text: persisted.normalized_text,
        source_snapshot: persisted.source_snapshot,
      });
    }

    return saved;
  });
}

function normalizeSourcePostText(input: unknown): string {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashContent(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function resolveWindowStart(windowDays: number): Date | null {
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return null;
  }

  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
}
