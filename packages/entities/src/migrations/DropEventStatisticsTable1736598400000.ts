import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropEventStatisticsTable1736598400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('event_statistics', true)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE event_statistics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL,
        post_count integer DEFAULT 0,
        user_count integer DEFAULT 0,
        comment_count integer DEFAULT 0,
        repost_count integer DEFAULT 0,
        like_count integer DEFAULT 0,
        sentiment jsonb NOT NULL DEFAULT '{"positive":0,"negative":0,"neutral":0}',
        hotness decimal(5,2) DEFAULT 0,
        trend_metrics jsonb,
        granularity varchar(50) DEFAULT 'hourly',
        snapshot_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "event_statistics_event_id_snapshot_at_unique" UNIQUE (event_id, snapshot_at),
        CONSTRAINT "fk_event_statistics_event" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE INDEX "idx_event_statistics_event_id" ON event_statistics(event_id);
      CREATE INDEX "idx_event_statistics_snapshot_at" ON event_statistics(snapshot_at);
      CREATE INDEX "idx_event_statistics_granularity" ON event_statistics(granularity);
    `)
  }
}
