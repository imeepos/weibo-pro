import { ViewColumn } from 'typeorm';
import { ViewEntity } from './decorator';

@ViewEntity({
  name: 'user_like_relations_mv',
  materialized: true,
  expression: `
    SELECT
      l.user_weibo_id as source_user_id,
      (p.user->>'id')::bigint as target_user_id,
      COUNT(*) as weight,
      MIN(l.created_at) as first_interaction_at,
      MAX(l.created_at) as last_interaction_at
    FROM weibo_likes l
    JOIN weibo_posts p ON l.target_weibo_id = p.id
    WHERE l.user_weibo_id != (p.user->>'id')::bigint
      AND p.user->>'id' IS NOT NULL
    GROUP BY l.user_weibo_id, (p.user->>'id')::bigint
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
  name: 'user_comment_relations_mv',
  materialized: true,
  expression: `
    SELECT
      (c.user->>'id')::bigint as source_user_id,
      (p.user->>'id')::bigint as target_user_id,
      COUNT(*) as weight,
      MIN(c.ingested_at) as first_interaction_at,
      MAX(c.ingested_at) as last_interaction_at
    FROM weibo_comments c
    JOIN weibo_posts p ON c.rootid = p.id
    WHERE c.user->>'id' IS NOT NULL
      AND p.user->>'id' IS NOT NULL
      AND c.user->>'id' != p.user->>'id'
    GROUP BY (c.user->>'id')::bigint, (p.user->>'id')::bigint
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
  name: 'user_repost_relations_mv',
  materialized: true,
  expression: `
    SELECT
      (r.user->>'id')::bigint as source_user_id,
      (r.retweeted_status->'user'->>'id')::bigint as target_user_id,
      COUNT(*) as weight,
      MIN(r.ingested_at) as first_interaction_at,
      MAX(r.ingested_at) as last_interaction_at
    FROM weibo_reposts r
    WHERE r.retweeted_status IS NOT NULL
      AND r.user->>'id' IS NOT NULL
      AND r.retweeted_status->'user'->>'id' IS NOT NULL
      AND r.user->>'id' != r.retweeted_status->'user'->>'id'
    GROUP BY (r.user->>'id')::bigint, (r.retweeted_status->'user'->>'id')::bigint
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

@ViewEntity({
  name: 'v_weibo_user_info',
  expression: `
    SELECT
      u.id,
      u.idstr,
      u.screen_name,
      u.name,
      u.followers_count,
      u.statuses_count,
      u.verified,
      COALESCE(NULLIF(u.location, ''), NULLIF(u.province, ''), NULLIF(u.city, ''), '未知') as location,
      COALESCE(u.avatar_hd, u.avatar_large, u.profile_image_url) as avatar,
      CASE
        WHEN u.verified_type IN (0, 1, 2, 3) THEN 'official'
        WHEN u.followers_count > 100000 THEN 'kol'
        WHEN u.verified = true THEN 'media'
        ELSE 'normal'
      END as user_type
    FROM weibo_users u
  `,
})
export class WeiboUserInfoView {
  @ViewColumn()
  id!: string;

  @ViewColumn()
  idstr!: string;

  @ViewColumn({ name: 'screen_name' })
  screenName!: string;

  @ViewColumn()
  name!: string;

  @ViewColumn({ name: 'followers_count' })
  followersCount!: number;

  @ViewColumn({ name: 'statuses_count' })
  statusesCount!: number;

  @ViewColumn()
  verified!: boolean;

  @ViewColumn()
  location!: string;

  @ViewColumn()
  avatar!: string;

  @ViewColumn({ name: 'user_type' })
  userType!: 'official' | 'kol' | 'media' | 'normal';
}
