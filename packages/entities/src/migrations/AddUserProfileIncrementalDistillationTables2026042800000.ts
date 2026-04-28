import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileIncrementalDistillationTables2026042800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_profile_distillation_tasks
      ADD COLUMN IF NOT EXISTS progress_json jsonb NULL,
      ADD COLUMN IF NOT EXISTS warnings_json jsonb NULL;

      CREATE TABLE IF NOT EXISTS user_profile_source_posts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        weibo_user_id bigint NOT NULL,
        post_id bigint NOT NULL,
        source_kind varchar(32) NOT NULL DEFAULT 'post',
        post_created_at timestamptz NULL,
        content_fingerprint varchar(128) NOT NULL,
        normalized_text text NOT NULL,
        source_snapshot jsonb NOT NULL,
        first_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        latest_task_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT user_profile_source_posts_unique UNIQUE (weibo_user_id, post_id),
        CONSTRAINT fk_user_profile_source_posts_user FOREIGN KEY (weibo_user_id) REFERENCES weibo_users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_profile_source_posts_post FOREIGN KEY (post_id) REFERENCES weibo_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_profile_source_posts_task FOREIGN KEY (latest_task_id) REFERENCES user_profile_distillation_tasks(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_profile_source_posts_user_id
      ON user_profile_source_posts(weibo_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_profile_source_posts_post_created_at
      ON user_profile_source_posts(post_created_at);

      CREATE TABLE IF NOT EXISTS user_profile_post_extractions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_post_id uuid NOT NULL,
        weibo_user_id bigint NOT NULL,
        task_id uuid NULL,
        extractor_version varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending',
        attempt_count integer NOT NULL DEFAULT 0,
        extracted_summary text NULL,
        extracted_json jsonb NULL,
        error_message text NULL,
        last_extracted_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT user_profile_post_extractions_unique UNIQUE (source_post_id, extractor_version),
        CONSTRAINT fk_user_profile_post_extractions_source FOREIGN KEY (source_post_id) REFERENCES user_profile_source_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_profile_post_extractions_user FOREIGN KEY (weibo_user_id) REFERENCES weibo_users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_profile_post_extractions_task FOREIGN KEY (task_id) REFERENCES user_profile_distillation_tasks(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_profile_post_extractions_user_id
      ON user_profile_post_extractions(weibo_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_profile_post_extractions_status
      ON user_profile_post_extractions(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_profile_post_extractions;
      DROP TABLE IF EXISTS user_profile_source_posts;
      ALTER TABLE user_profile_distillation_tasks
      DROP COLUMN IF EXISTS warnings_json,
      DROP COLUMN IF EXISTS progress_json;
    `);
  }
}
