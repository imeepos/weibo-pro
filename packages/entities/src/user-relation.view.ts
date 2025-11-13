import { ViewColumn } from 'typeorm';
import { ViewEntity } from './decorator';

@ViewEntity({
  name: 'user_like_relations_view',
  expression: `
    SELECT
      l.user_weibo_id as source_user_id,
      (p.user->>'id')::numeric as target_user_id,
      COUNT(*) as weight,
      MIN(l.created_at) as first_interaction_at,
      MAX(l.created_at) as last_interaction_at
    FROM weibo_likes l
    JOIN weibo_posts p ON l.target_weibo_id = p.id
    WHERE l.user_weibo_id != (p.user->>'id')::numeric
      AND p.user->>'id' IS NOT NULL
    GROUP BY l.user_weibo_id, p.user->>'id'
  `,
})
export class UserLikeRelationView {
  @ViewColumn({ name: 'source_user_id' })
  sourceUserId!: string;

  @ViewColumn({ name: 'target_user_id' })
  targetUserId!: string;

  @ViewColumn({ name: 'weight' })
  weight!: number;

  @ViewColumn({ name: 'first_interaction_at' })
  firstInteractionAt!: Date;

  @ViewColumn({ name: 'last_interaction_at' })
  lastInteractionAt!: Date;
}

@ViewEntity({
  name: 'user_comment_relations_view',
  expression: `
    SELECT
      (c.user->>'id')::numeric as source_user_id,
      (p.user->>'id')::numeric as target_user_id,
      COUNT(*) as weight,
      MIN(c.ingestedAt) as first_interaction_at,
      MAX(c.ingestedAt) as last_interaction_at
    FROM weibo_comments c
    JOIN weibo_posts p ON c.rootid = p.id
    WHERE c.user->>'id' IS NOT NULL
      AND p.user->>'id' IS NOT NULL
      AND c.user->>'id' != p.user->>'id'
    GROUP BY c.user->>'id', p.user->>'id'
  `,
})
export class UserCommentRelationView {
  @ViewColumn({ name: 'source_user_id' })
  sourceUserId!: string;

  @ViewColumn({ name: 'target_user_id' })
  targetUserId!: string;

  @ViewColumn({ name: 'weight' })
  weight!: number;

  @ViewColumn({ name: 'first_interaction_at' })
  firstInteractionAt!: Date;

  @ViewColumn({ name: 'last_interaction_at' })
  lastInteractionAt!: Date;
}

@ViewEntity({
  name: 'user_repost_relations_view',
  expression: `
    SELECT
      (r.user->>'id')::numeric as source_user_id,
      (r.retweeted_status->'user'->>'id')::numeric as target_user_id,
      COUNT(*) as weight,
      MIN(r.ingested_at) as first_interaction_at,
      MAX(r.ingested_at) as last_interaction_at
    FROM weibo_reposts r
    WHERE r.retweeted_status IS NOT NULL
      AND r.user->>'id' IS NOT NULL
      AND r.retweeted_status->'user'->>'id' IS NOT NULL
      AND r.user->>'id' != r.retweeted_status->'user'->>'id'
    GROUP BY r.user->>'id', r.retweeted_status->'user'->>'id'
  `,
})
export class UserRepostRelationView {
  @ViewColumn({ name: 'source_user_id' })
  sourceUserId!: string;

  @ViewColumn({ name: 'target_user_id' })
  targetUserId!: string;

  @ViewColumn({ name: 'weight' })
  weight!: number;

  @ViewColumn({ name: 'first_interaction_at' })
  firstInteractionAt!: Date;

  @ViewColumn({ name: 'last_interaction_at' })
  lastInteractionAt!: Date;
}

