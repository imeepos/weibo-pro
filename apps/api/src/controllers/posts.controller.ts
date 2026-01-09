import { Controller } from '@sker/core';
import { useEntityManager, WeiboPostEntity, PostProcessFlags } from '@sker/entities';
import * as sdk from '@sker/sdk';

@Controller(sdk.PostsController)
export class PostsController implements sdk.PostsController {
  async getPendingNLPPosts(
    cursor?: string,
    pageSize?: number
  ): Promise<sdk.GetPendingNLPPostsResponse> {
    const limit = pageSize || 20;

    const posts = await useEntityManager(async (manager) => {
      const qb = manager
        .createQueryBuilder(WeiboPostEntity, 'post')
        .select(['post.id', 'post.event_id', 'post.ingested_at'])
        .where('(post.process_flags & :nlpFlag) = 0', {
          nlpFlag: PostProcessFlags.NLP_COMPLETED,
        })
        .andWhere('post.deleted_at IS NULL')
        .orderBy('post.ingested_at', 'ASC')
        .limit(limit);

      if (cursor) {
        qb.andWhere('post.ingested_at > :cursor', {
          cursor: new Date(Number(cursor)),
        });
      }

      return await qb.getMany();
    });

    return {
      posts: posts.map((p) => ({
        id: p.id,
        event_id: p.event_id,
        ingested_at: p.ingested_at.toISOString(),
      })),
      hasMore: posts.length >= limit,
      cursor: posts.length > 0 ? posts.at(-1)!.ingested_at.getTime().toString() : null,
    };
  }
}
