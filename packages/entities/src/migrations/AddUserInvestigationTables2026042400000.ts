import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserInvestigationTables2026042400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weibo_user_persona_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        weibo_user_id bigint NOT NULL,
        persona_id uuid NOT NULL,
        is_primary boolean NOT NULL DEFAULT true,
        status varchar(32) NOT NULL DEFAULT 'active',
        confidence decimal(5, 2) NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT weibo_user_persona_links_unique UNIQUE (weibo_user_id, persona_id),
        CONSTRAINT fk_weibo_user_persona_links_user FOREIGN KEY (weibo_user_id) REFERENCES weibo_users(id) ON DELETE CASCADE,
        CONSTRAINT fk_weibo_user_persona_links_persona FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_weibo_user_persona_links_user_id ON weibo_user_persona_links(weibo_user_id);
      CREATE INDEX IF NOT EXISTS idx_weibo_user_persona_links_persona_id ON weibo_user_persona_links(persona_id);

      CREATE TABLE IF NOT EXISTS user_profile_distillation_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        weibo_user_id bigint NOT NULL,
        event_id uuid NULL,
        status varchar(32) NOT NULL DEFAULT 'queued',
        history_window_days integer NOT NULL DEFAULT 90,
        source_post_count integer NOT NULL DEFAULT 0,
        source_comment_count integer NOT NULL DEFAULT 0,
        source_repost_count integer NOT NULL DEFAULT 0,
        evidence_sample_count integer NOT NULL DEFAULT 0,
        model varchar(128) NULL,
        prompt_version varchar(64) NULL,
        distilled_summary text NULL,
        distilled_json jsonb NULL,
        review_status varchar(32) NULL,
        error_message text NULL,
        started_at timestamptz NULL,
        completed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_profile_distillation_tasks_user FOREIGN KEY (weibo_user_id) REFERENCES weibo_users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_profile_distillation_tasks_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_profile_distillation_tasks_user_id ON user_profile_distillation_tasks(weibo_user_id);
      CREATE INDEX IF NOT EXISTS idx_user_profile_distillation_tasks_event_id ON user_profile_distillation_tasks(event_id);
      CREATE INDEX IF NOT EXISTS idx_user_profile_distillation_tasks_status ON user_profile_distillation_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_user_profile_distillation_tasks_review_status ON user_profile_distillation_tasks(review_status);
      CREATE INDEX IF NOT EXISTS idx_user_profile_distillation_tasks_created_at ON user_profile_distillation_tasks(created_at);

      CREATE TABLE IF NOT EXISTS memory_evidence (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id uuid NOT NULL,
        source_table varchar(64) NOT NULL,
        source_id varchar(255) NOT NULL,
        excerpt text NULL,
        evidence_type varchar(32) NOT NULL,
        score decimal(5, 2) NOT NULL DEFAULT 1,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_memory_evidence_memory FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_memory_evidence_memory_id ON memory_evidence(memory_id);
      CREATE INDEX IF NOT EXISTS idx_memory_evidence_source_ref ON memory_evidence(source_table, source_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS memory_evidence;
      DROP TABLE IF EXISTS user_profile_distillation_tasks;
      DROP TABLE IF EXISTS weibo_user_persona_links;
    `);
  }
}
